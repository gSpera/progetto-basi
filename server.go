package main

import (
	"crypto/sha256"
	"database/sql"
	"encoding/csv"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"io"
	"io/fs"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v4"
	log "github.com/sirupsen/logrus"
	"rsc.io/qr"
)

type Server struct {
	jwtSecret []byte

	Database        Database
	AttachmentStore AttachmentStore
	Template        *template.Template
	Log             *log.Entry
}

func NewServer(db Database, attachments AttachmentStore, tmplDir fs.FS, logger *log.Entry, jwtSecret []byte) (Server, error) {
	tmpl := template.New("html")
	_, err := tmpl.ParseFS(tmplDir, "*.tmpl")
	if err != nil {
		return Server{}, fmt.Errorf("cannot parse template: %w", err)
	}

	return Server{
		Database:        db,
		AttachmentStore: attachments,
		Template:        tmpl,
		Log:             logger,
		jwtSecret:       jwtSecret,
	}, nil
}

// DeliverOrder is called externally and is used to signal that an order has been delivered
// this functions returns the order and an error
func (s *Server) DeliverOrder(orderID int) (order, companyName, city string, err error) {
	// Maybe not hardcode value
	_, err = s.Database.AddStateToOrder(orderID, 7, time.Now())
	if err != nil {
		return "", "", "", fmt.Errorf("cannot add state: %w", err)
	}

	row := s.Database.InfoForOrder(orderID)
	err = row.Scan(&order, &companyName, &city)
	if errors.Is(err, sql.ErrNoRows) {
		return "", "", "", fmt.Errorf("cannot find order: %w", err)
	}
	if err != nil {
		return "", "", "", fmt.Errorf("cannot scan order info: %w", err)
	}

	return
}

func (s *Server) HandleHome(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "tmpl/ordini.html")
}
func (s *Server) HandleManageUsers(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "tmpl/utenze.html")
}

func (s *Server) HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		err := s.Template.ExecuteTemplate(w, "login.tmpl", nil)
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			s.Log.Errorln("Rendering login template:", err)
		}
		return
	}
	loginError := func(msg string) {
		err := s.Template.ExecuteTemplate(w, "login.tmpl", msg)
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			s.Log.Errorln("Rendering error login template:", err)
		}
	}

	// Not the best, not secure
	r.ParseForm()
	username := r.PostForm.Get("username")
	password := r.PostForm.Get("password")
	row := s.Database.GetUserInfoByName(username)

	var (
		correctHash string
		aziendaId   int
		azienda     string
		aziendaRole int
		userRole    UserRole
		regionPtr   *int
	)

	err := row.Scan(&correctHash, &aziendaId, &azienda, &aziendaRole, &userRole, &regionPtr)
	if err == sql.ErrNoRows {
		loginError("Utente non trovato")
		log.Warningln("User not found")
		return
	} else if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		log.Errorln("Cannot query password:", err)
		return
	}

	region := -1
	if regionPtr != nil {
		region = *regionPtr
	}

	hashBytes := sha256.Sum256([]byte(password))
	hash := hex.EncodeToString(hashBytes[:])

	if hash != correctHash {
		loginError("Password sbagliata")
		log.Warningf("Wrong password: given: %s(%q), expected: %s\n", hash, password, correctHash)
		return
	}

	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, UserCookie{
		Username:    username,
		CompanyID:   aziendaId,
		CompanyName: azienda,
		CompanyRole: aziendaRole,
		UserRole:    userRole,
		Region:      region,
		Expiration:  time.Now().AddDate(0, 0, 7),
	}.Claims())
	jwtTok, err := tok.SignedString(s.jwtSecret)
	if err != nil {
		log.Errorln("Cannot sign JWT token:", err)
	}

	log.Println("Login successfull")
	http.SetCookie(w, &http.Cookie{Name: "user", Value: jwtTok, HttpOnly: true, Expires: time.Now().AddDate(0, 0, 7)})
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func (s *Server) HandleLogout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{Name: "user", Value: "", HttpOnly: true, Expires: time.Now().AddDate(0, 0, -1)})
	http.Redirect(w, r, "/login", http.StatusTemporaryRedirect)
}

func (s *Server) HandlerApiGetOrders(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("user")
	if err != nil {
		log.Infoln("Cannot parse cookie:", err)
		http.Error(w, "Login first", http.StatusUnauthorized)
		return
	}

	claims, err := UserCookieFromJWT(s.parseJWTToken(cookie.Value))
	if err != nil {
		log.Warnln("Cannot parse jwt:", err)
		http.Error(w, "Invalid jwt", http.StatusBadRequest)
		return
	}
	isAdmin := claims.CompanyID < 0

	type Order struct {
		ID                int     `db:"ID"`
		DDT               string  `db:"DDT"`
		Order             string  `sqlite:"ordine"`
		Protocollo        string  `sqlite:"protocollo"`
		ProducerName      string  `db:"PRODUTTORE_NOME" sqlite:"produttore_nome"`
		ProducerID        int     `db:"PRODUTTORE_ID" sqlite:"produttore_id"`
		RecipientName     string  `db:"DESTINATARIO_NOME" sqlite:"destinatario_nome"`
		RecipientID       int     `db:"DESTINATARIO_ID" sqlite:"destinatario_id"`
		NumPackages       string  `db:"NUM_COLLI" sqlite:"num_colli"`
		WithdrawBankCheck bool    `db:"RITIRARE_ASSEGNO" sqlite:"ritirare_assegno"`
		Invoiced          bool    `sqlite:"fatturato"`
		StateID           int     `db:"STATO" sqlite:"stato"`
		StateString       string  `db:"STATO_STRING" sqlite:"stato_string"`
		When              SqlTime `db:"QUANDO" sqlite:"quando"`
		Carrier           string  `sqlite:"trasportatore"`
		RegionID          int     `sqlite:"regione_id"`
		Region            string  `sqlite:"regione"`
		CreationDate      SqlTime `sqlite:"data_creazione"`
		ArriveDate        SqlTime `sqlite:"data_consegna"`
	}

	orders, err := s.Database.LatestStatesFor(claims.UserRole, claims.Username, claims.CompanyID, claims.Region)
	if err != nil {
		log.Errorln("Cannot retrieve orders:", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer orders.Close()

	result := make([]Order, 0, 10)
	for orders.Next() {
		var order Order
		err := orders.StructScan(&order)
		if err != nil {
			log.Errorln("Cannot scan row:", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		if !isAdmin {
			// Censor sensitive information
			order.Invoiced = false
			order.Carrier = ""
		}

		result = append(result, order)
	}

	encoder := json.NewEncoder(w)
	encoder.SetIndent("", "\t")
	err = encoder.Encode(result)
	if err != nil {
		log.Errorln("Cannot encode json:", err)
	}
}

func (s *Server) HandleExportCsv(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("user")
	if err != nil {
		log.Infoln("Cannot parse cookie:", err)
		http.Error(w, "Login first", http.StatusUnauthorized)
		return
	}

	claims, err := UserCookieFromJWT(s.parseJWTToken(cookie.Value))
	if err != nil {
		log.Warnln("Cannot parse jwt:", err)
		http.Error(w, "Invalid jwt", http.StatusBadRequest)
		return
	}
	type Order struct {
		ID                int     `db:"ID"`
		DDT               string  `db:"DDT"`
		Order             string  `sqlite:"ordine"`
		Protocollo        string  `sqlite:"protocollo"`
		ProducerName      string  `db:"PRODUTTORE_NOME" sqlite:"produttore_nome"`
		ProducerID        int     `db:"PRODUTTORE_ID" sqlite:"produttore_id"`
		RecipientName     string  `db:"DESTINATARIO_NOME" sqlite:"destinatario_nome"`
		RecipientID       int     `db:"DESTINATARIO_ID" sqlite:"destinatario_id"`
		NumPackages       string  `db:"NUM_COLLI" sqlite:"num_colli"`
		WithdrawBankCheck bool    `db:"RITIRARE_ASSEGNO" sqlite:"ritirare_assegno"`
		Invoiced          bool    `sqlite:"fatturato"`
		StateID           int     `db:"STATO" sqlite:"stato"`
		StateString       string  `db:"STATO_STRING" sqlite:"stato_string"`
		When              SqlTime `db:"QUANDO" sqlite:"quando"`
		Carrier           string  `sqlite:"trasportatore"`
		Region            string  `sqlite:"regione"`
		CreationDate      SqlTime `sqlite:"data_creazione"`
		ArriveDate        SqlTime `sqlite:"data_consegna"`
	}
	header := []string{
		"ID", "DDT", "Ordine", "Protocollo", "Destinatario",
		"Num Pacchi", "Assegno", "Stato", "Data aggiornamento",
		"Data Creazione", "Stima Arrivo",
	}
	orderString := func(o Order) []string {
		v := make([]string, 11)
		v[0] = fmt.Sprint(o.ID)
		v[1] = o.DDT
		v[2] = o.Order
		v[3] = o.Protocollo
		v[4] = o.RecipientName
		v[5] = o.NumPackages
		v[6] = fmt.Sprint(o.WithdrawBankCheck)
		v[7] = o.StateString
		v[8] = o.When.String()
		v[9] = o.CreationDate.String()
		v[10] = o.ArriveDate.String()
		return v
	}

	orders, err := s.Database.LatestStatesFor(claims.UserRole, claims.Username, claims.CompanyID, claims.Region)
	if err != nil {
		log.Errorln("Cannot retrieve orders:", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer orders.Close()

	filename := fmt.Sprintf("attachment; filename=\"speralogistica-%s.csv\"", strings.ReplaceAll(time.Now().Format(time.DateTime), " ", "-"))
	w.Header().Add("Content-Disposition", filename)
	csvWriter := csv.NewWriter(w)
	csvWriter.Write(header)
	var errs error
	for orders.Next() {
		var order Order
		err := orders.StructScan(&order)
		if err != nil {
			log.Errorln("Cannot scan row:", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		errs = errors.Join(errs, csvWriter.Write(orderString(order)))
	}

	if errs != nil {
		log.Errorln("Cannot encode csv:", err)
	}
}

func (s *Server) HandleApiInfoOrder(w http.ResponseWriter, r *http.Request) {
	type stateRes struct {
		State   string  `db:"STATO" sqlite:"stato"`
		StateID int     `db:"STATOID" sqlite:"statoID"`
		When    SqlTime `db:"QUANDO" sqlite:"quando"`
	}
	type viaggioRes struct {
		StartDate    SqlTime `db:"DATA_PARTENZA"`
		EndDate      SqlTime `db:"DATA_ARRIVO"`
		Partenza     string  `db:"PARTENZA"`
		Destinazione string  `db:"DESTINAZIONE"`
		Motrice      string  `db:"MOTRICE"`
	}
	states := make([]stateRes, 0, 7)
	viaggios := make([]viaggioRes, 0, 7)
	r.ParseForm()
	idString := r.Form.Get("id")
	id, err := strconv.Atoi(idString)
	if err != nil {
		log.Errorf("Cannot parse inte ordine id: %q: %v\n", id, err)
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	statesQuery, err := s.Database.StatesForOrdine(id)
	if err != nil {
		log.Errorln("Cannot retrieve states:", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer statesQuery.Close()

	for statesQuery.Next() {
		var state stateRes
		err := statesQuery.StructScan(&state)
		if err != nil {
			log.Errorln("Cannot scan row:", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		states = append(states, state)
	}

	viaggioQuery, err := s.Database.ViagginiForOrdine(id)
	if err != nil {
		log.Errorln("Cannot retrieve viaggi:", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer viaggioQuery.Close()

	for viaggioQuery.Next() {
		var viaggio viaggioRes
		err := viaggioQuery.StructScan(&viaggio)
		if err != nil {
			log.Errorln("Cannot scan row:", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		viaggios = append(viaggios, viaggio)
	}

	note, err := s.Database.RetrieveOrderNote(id)

	encoder := json.NewEncoder(w)
	encoder.SetIndent("", "\t")
	err = encoder.Encode(struct {
		Note   string
		States []stateRes
		Viaggi []viaggioRes
	}{
		note,
		states,
		viaggios,
	})
	if err != nil {
		log.Errorln("Cannot encode json:", err)
	}
}

func (s *Server) HandlerApiAboutMe(w http.ResponseWriter, r *http.Request) {
	var result struct {
		CompanyID   int
		CompanyName string
		CompanyRole int
		Username    string
		UserRole    UserRole
	}

	cookie, _ := r.Cookie("user")
	claims, _ := UserCookieFromJWT(s.parseJWTToken(cookie.Value))

	result.CompanyID = claims.CompanyID
	result.CompanyName = claims.CompanyName
	result.CompanyRole = claims.CompanyRole
	result.Username = claims.Username
	result.UserRole = claims.UserRole

	encoder := json.NewEncoder(w)
	encoder.SetIndent("", "\t")
	err := encoder.Encode(result)
	if err != nil {
		log.Errorln("Cannot encode json:", err)
	}
}

func (s *Server) HandlerApiReceivers(w http.ResponseWriter, r *http.Request) {
	type receiver struct {
		ID   int    `db:"ID"`
		Name string `db:"NOME" sqlite:"nome"`
	}

	var result struct {
		ShowSender bool
		Receivers  []receiver
	}

	cookie, _ := r.Cookie("user")
	claims, _ := UserCookieFromJWT(s.parseJWTToken(cookie.Value))

	result.ShowSender = claims.CompanyID < 0
	orders, err := s.Database.CompanyNameByID(claims.CompanyID)
	if err != nil {
		log.Errorln("Cannot retrieve orders:", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer orders.Close()

	for orders.Next() {
		var r receiver
		err := orders.StructScan(&r)
		if err != nil {
			log.Errorln("Cannot scan row:", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		result.Receivers = append(result.Receivers, r)
	}
	encoder := json.NewEncoder(w)
	encoder.SetIndent("", "\t")
	err = encoder.Encode(result)
	if err != nil {
		log.Errorln("Cannot encode json:", err)
	}
}

type NewOrderInput struct {
	OrderID int // Only Edit

	Sender       int `json:",string"`
	ReceiverID   int `json:",string"`
	State        int `json:",string"`
	DDT          string
	Order        string
	Protocollo   string
	NumColli     string
	Assegno      bool
	Fatturato    bool
	Carrier      string
	ArriveDate   SqlTime
	CreationDate SqlTime
	Note         string
}

func (s *Server) HandleApiNewOrder(w http.ResponseWriter, r *http.Request) {
	var input NewOrderInput

	defer r.Body.Close()
	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		s.Log.Errorln("Cannot read body in new order:", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	assegno := 0
	if input.Assegno {
		assegno = 1
	}
	fatturato := 0
	if input.Fatturato {
		fatturato = 1
	}

	if input.Order == "" {
		http.Error(w, "Invalid Request", http.StatusBadRequest)
		s.Log.Warnln("Invalid request: no order")
		return
	}

	res, err := s.Database.NewOrder(input, assegno, fatturato)
	if err != nil {
		s.Log.Errorln("Cannot insert order:", err, res)
		http.Error(w, "Invalid Request", http.StatusBadRequest)
		return
	}

	// Does this causes a race condition??
	id, err := res.LastInsertId()
	if err != nil {
		s.Log.Errorln("Cannot get inserted row id:", err)
	}

	_, err = s.Database.AddStateToOrder(int(id), input.State, time.Now())
	if err != nil {
		s.Log.Errorln("Cannot add state to order:", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	s.Log.Printf("Insert new order: id=%d input=%+v\n", id, input)
}

func (s *Server) HandleApiEditOrder(w http.ResponseWriter, r *http.Request) {
	var input NewOrderInput

	defer r.Body.Close()
	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		s.Log.Errorln("Cannot read body in edit order:", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	if input.Order == "" {
		http.Error(w, "Invalid Request", http.StatusBadRequest)
		s.Log.Warnln("Invalid request: no order")
		return
	}

	res, err := s.Database.EditOrder(input)
	if err != nil {
		s.Log.Errorln("Cannot update order:", err, res)
		http.Error(w, "Invalid Request", http.StatusBadRequest)
		return
	}

	if input.State != 0 {
		_, err := s.Database.AddStateToOrder(input.OrderID, input.State, time.Now())
		if err != nil {
			s.Log.Errorln("Cannot add state to order:", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
	}

	s.Log.Println("Update order:", input)
}

func (s *Server) HandleApiNewAzienda(w http.ResponseWriter, r *http.Request) {
	input := struct {
		Name       string
		Role       int `json:",string"`
		Address    string
		PIva       string
		CodUnivoco string
		Comune     string
		RegioneID  int `json:",string"`
	}{}

	defer r.Body.Close()
	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		s.Log.Errorln("Cannot read body in new order:", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	if strings.TrimSpace(input.Name) == "" {
		http.Error(w, "Invalid Request", http.StatusBadRequest)
		return
	}

	var addr sql.NullString
	if strings.TrimSpace(input.Address) != "" {
		addr.Valid = true
		addr.String = input.Address
	}

	var piva sql.NullString
	if strings.TrimSpace(input.PIva) != "" {
		piva.Valid = true
		piva.String = input.PIva
	}

	var codunivoco sql.NullString
	if strings.TrimSpace(input.CodUnivoco) != "" {
		codunivoco.Valid = true
		codunivoco.String = input.CodUnivoco
	}

	_, err = s.Database.NewAzienda(input.Name, input.Role, addr, piva, codunivoco, input.Comune, input.RegioneID)
	if err != nil {
		s.Log.Errorln("Cannot create azienda:", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	s.Log.Println("New azienda:", input)
}

func (s *Server) HandleApiUpdateOrder(w http.ResponseWriter, r *http.Request) {
	input := struct {
		OrderID int
		State   int `json:",string"`
		When    time.Time
	}{}

	defer r.Body.Close()
	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		s.Log.Errorln("Cannot read body in new order:", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	_, err = s.Database.AddStateToOrder(input.OrderID, input.State, input.When)
	if err != nil {
		s.Log.Errorln("Cannot add state to order:", err)
		http.Error(w, "Invalid Request", http.StatusBadRequest)
		return
	}
	s.Log.Println("New State:", input)
}

func (s *Server) HandleApiUpdateArriveDate(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()
	orderIDString := r.Form.Get("id")
	newDateString := r.Form.Get("date")
	orderID, err := strconv.Atoi(orderIDString)
	if err != nil {
		http.Error(w, "Internal Error", http.StatusBadRequest)
		return
	}
	newDate, err := time.Parse(time.RFC3339Nano, newDateString)
	if err != nil {
		http.Error(w, "Internal Error", http.StatusBadRequest)
		return
	}

	_, err = s.Database.UpdateArriveDate(orderID, newDate)
	if err != nil {
		s.Log.Errorln("Cannot update arrive date:", err)
		http.Error(w, "Invalid Request", http.StatusBadRequest)
		return
	}
}
func (s *Server) HandleApiRetrieveNote(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()
	orderIDString := r.Form.Get("id")
	orderID, err := strconv.Atoi(orderIDString)
	if err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}
	note, err := s.Database.RetrieveOrderNote(orderID)
	if err != nil {
		s.Log.Errorln("Retrieve Order Note:", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	fmt.Fprintln(w, note)
}

func (s *Server) HandleApiDeleteOrder(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()
	orderIDString := r.Form.Get("id")
	orderID, err := strconv.Atoi(orderIDString)
	if err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	_, err = s.Database.DeleteOrder(orderID)
	if err != nil {
		s.Log.Errorln("Delete order:", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
}

func (s *Server) HandleApiRetrieveAttachments(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()
	orderIDString := r.Form.Get("id")
	orderID, err := strconv.Atoi(orderIDString)
	if err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	attachments, err := s.AttachmentStore.List(orderID)
	if err != nil {
		s.Log.Errorln("Retrieve attachments for order:", orderID, ":", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	encoder := json.NewEncoder(w)
	encoder.SetIndent("", "\t")
	encoder.Encode(attachments)
}

func (s *Server) HandleApiUploadFile(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(100 * 1024 * 1024) // 100Mb
	if err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	orderIDString := r.FormValue("id")
	orderID, err := strconv.Atoi(orderIDString)
	if err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	fl, header, err := r.FormFile("attachment")
	if err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	defer fl.Close()

	deliver := r.FormValue("deliver") == "on"

	s.Log.Printf("Writing attachment for order: %d: %s, deliver: %v\n", orderID, header.Filename, deliver)
	err = s.AttachmentStore.Put(orderID, header.Filename, fl)
	if err != nil {
		s.Log.Errorf("Cannot write attachment for order: %d: %s: %v\n", orderID, header.Filename, err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	if deliver {
		s.Log.Printf("Delivering order: %v\n", orderID)
		_, _, _, err := s.DeliverOrder(orderID)
		if err != nil {
			s.Log.Errorf("Cannot deliver order: %v: %v\n", orderID, err)
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}
	}
}

func (s *Server) HandleRetrieveAttachment(w http.ResponseWriter, r *http.Request) {
	var orderID int
	var filename string

	_, err := fmt.Sscanf(r.URL.Path, "/attachments/%d/%s", &orderID, &filename)
	if err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	s.Log.Println("Retrieve attachment:", orderID, filename)
	reader, err := s.AttachmentStore.Get(orderID, filename)
	if err != nil {
		s.Log.Errorln("Cannot serve attachment:", err)
		return
	}

	_, err = io.Copy(w, reader)
	if err != nil {
		s.Log.Errorln("Cannot send attachment:", err)
		return
	}
}

func (s *Server) HandleApiDeleteAttachment(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()
	orderIDString := r.Form.Get("id")
	filename := r.Form.Get("name")
	orderID, err := strconv.Atoi(orderIDString)

	if err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	s.Log.Printf("Deleting attachment %d %q\n", orderID, filename)
	err = s.AttachmentStore.Delete(orderID, filename)
	if err != nil {
		s.Log.Errorf("Cannot delete attachment for order %d %q %v", orderID, filename, err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
}

func (s *Server) HandleApiAttachmentIcons(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()
	idsValue := r.FormValue("ids")
	idsStringList := strings.Split(idsValue, ",")

	res := make(map[int]int, len(idsStringList))
	for _, value := range idsStringList {
		id, err := strconv.Atoi(value)
		if err != nil {
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}

		res[id], err = s.AttachmentStore.HowMany(id)
		if err != nil {
			s.Log.Errorln("Cannot retrieve len of attachments for order:", id, ":", err)
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}
	}

	encoder := json.NewEncoder(w)
	encoder.SetIndent("", "\t")
	encoder.Encode(res)
}

func (s *Server) HandlePrintStamp(w http.ResponseWriter, r *http.Request) {
	var orderID int
	_, err := fmt.Sscanf(r.URL.Path, "/stamp/%d", &orderID)
	if err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	r.ParseForm()
	stampNote := r.Form.Get("note")

	res := s.Database.LoadStampInfoFor(orderID)
	var info struct {
		ID                int
		OrderID           int    `sqlite:"ordine_id"`
		Order             string `sqlite:"ordine"`
		DDT               *string
		NumPackages       string  `sqlite:"num_colli"`
		WithdrawBankCheck bool    `sqlite:"ritirare_assegno"`
		CompanyID         int     `sqlite:"azienda_id"`
		CompanyName       string  `sqlite:"nome"`
		CompanyRegion     string  `sqlite:"regione"`
		CompanyCity       *string `sqlite:"comune"`
		CompanyAddress    *string `sqlite:"indirizzo"`
		Note              string
	}
	info.ID = orderID
	info.Note = stampNote
	err = res.StructScan(&info)
	if errors.Is(err, sql.ErrNoRows) {
		http.Error(w, "Not found", http.StatusNotFound)
		s.Log.Warnln("Order:", orderID, "not found")
		return
	}

	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		s.Log.Errorln("Cannot scan info for stamp:", orderID, ":", err)
		return
	}

	tmpl, err := template.New("stamp").ParseFiles("tmpl/print-stamp.tmpl")
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		s.Log.Errorln("Cannot parse stamp template:", err)
		return
	}
	err = tmpl.ExecuteTemplate(w, "print-stamp.tmpl", info)
	if err != nil {
		s.Log.Errorln("Cannot execute stamp template:", err)
		return
	}
}

func (s *Server) HandleApiInfoForCompany(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()
	companyID, err := strconv.Atoi(r.FormValue("id"))
	if err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	row := s.Database.InfoForCompany(companyID)
	res := struct {
		Name     string  `sqlite:"nome"`
		Address  *string `sqlite:"indirizzo"`
		City     *string `sqlite:"comune"`
		RegionID int     `sqlite:"regione" json:",string"`
	}{}
	err = row.StructScan(&res)
	if errors.Is(err, sql.ErrNoRows) {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		s.Log.Errorln("Cannot scan company info:", companyID, ":", err)
		return
	}

	enc := json.NewEncoder(w)
	enc.SetIndent("", "\t")
	enc.Encode(res)
}

func (s *Server) HandleApiUsersForCompany(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()
	companyID, err := strconv.Atoi(r.FormValue("id"))
	if err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	users, err := s.Database.UsersByCompanyID(companyID)
	if err != nil {
		http.Error(w, "Internal server errror", http.StatusInternalServerError)
		s.Log.Errorln("Cannot get users for company:", companyID, err)
		return
	}
	type User struct {
		Name      string `sqlite:"nome"`
		Role      int    `sqlite:"ruolo"`
		Region    *int   `sqlite:"regione"`
		CompanyID int    `sqlite:"azienda_id"`
		Stores    []int  `sqlite:"-"`
	}
	res := make([]User, 0, 10)
	var errs error
	for users.Next() {
		var u User
		err := users.StructScan(&u)
		if err != nil {
			errs = errors.Join(errs, fmt.Errorf("cannot scan user: %w", err))
			continue
		}

		if u.Role == UserRoleZone {
			// Load stores
			stores, err := s.Database.LoadStoresForUser(u.Name)
			if err != nil {
				errs = errors.Join(errs, fmt.Errorf("cannot load stores for user: %w", err))
				continue
			}
			u.Stores = stores
		}

		res = append(res, u)
	}

	if errs != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		s.Log.Errorln("Cannot scan users:", companyID, ":", errs)
		return
	}

	enc := json.NewEncoder(w)
	enc.SetIndent("", "\t")
	enc.Encode(res)
}

func (s *Server) HandleApiUpdateCompany(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	input := struct {
		CompanyID int    `json:"EditCompanyID,string"`
		Name      string `json:"Name"`
		Address   string `json:"Address"`
		City      string `json:"Comune"`
		RegionID  int    `json:"RegioneID,string"`
	}{}

	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	s.Log.Println("Update company:", input.CompanyID, input)
	_, err = s.Database.UpdateCompany(input.CompanyID, input.Name, input.RegionID, input.City, input.Address)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		s.Log.Errorln("Cannot update company:", input.CompanyID, err)
		return
	}
}

func (s *Server) HandleApiQRCodeForStamp(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()
	orderID, err := strconv.Atoi(r.FormValue("id"))
	if err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	qrcode, err := qr.Encode(fmt.Sprintf("SPERA-LOGISTICA-ORDINE:%d", orderID), qr.Q)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		s.Log.Errorln("Cannot encode qr code:", err)
		return
	}
	_, err = w.Write(qrcode.PNG())
	if err != nil {
		s.Log.Errorln("Cannot encode image:", err)
		return
	}
}

func (s *Server) HandleApiEditOrNewUser(w http.ResponseWriter, r *http.Request) {
	log := s.Log.WithField("handler", "ApiEditOrNewUser")
	r.ParseForm()
	type Body struct {
		Username string   `json:"username"`
		Password string   `json:"password"`
		Role     UserRole `json:"role,string"`
		Region   int      `json:"region,string"` // Valid if role == RoleRegion
		Store    []int    `json:"stores"`        // Valid if role == RoleStore or RoleZone
	}
	var user Body
	defer r.Body.Close()
	dec := json.NewDecoder(r.Body)
	err := dec.Decode(&user)
	if err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		log.Warnln("Cannot decode edit user:", err)
		return
	}

	user.Username = strings.TrimSpace(user.Username)
	user.Password = strings.TrimSpace(user.Password)

	if len(user.Username) < 2 || (len(user.Password) < 8 && len(user.Password) != 0) ||
		user.Role < 0 || user.Role > UserRoleMaxValue ||
		(user.Role == UserRoleStore && len(user.Store) != 1) {

		http.Error(w, "Bad Request", http.StatusBadRequest)
		log.Warnln("Invalid request for edit or new user")
		return
	}

	u := user
	u.Password = "[REDACTED]"
	if user.Password == "" {
		u.Password = "[UNCHANGED]"
	}
	log.Infof("Inserting or editing user: %#v", u)

	var region *int
	var mainStore int
	var stores []int
	switch user.Role {
	case UserRoleRegion:
		mainStore = 0 // TODO: Hardcoded
		region = new(int)
		*region = user.Region
		stores = nil
	case UserRoleStore:
		mainStore = user.Store[0]
		stores = nil
	case UserRoleZone:
		mainStore = 0 // TODO: Hardcoded
		stores = user.Store
	}

	hashBytes := sha256.Sum256([]byte(user.Password))
	hash := hex.EncodeToString(hashBytes[:])

	if user.Password == "" {
		hash = ""
	}

	regionV := -1
	if region != nil {
		regionV = *region
	}
	log.Infof("Database: username=%q hash=%q role=%d region=%p(%d) mainStore=%d stores=%v", user.Username, hash, user.Role, region, regionV, mainStore, stores)
	err = s.Database.InsertOrEditUser(user.Username, hash, user.Role, region, mainStore, stores)

	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		log.Errorln("Cannot insert into database:", err)
		return
	}

	w.Write([]byte("Ok"))
}

func (s *Server) HandleApiDeleteUser(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()

	username := r.Form.Get("user")
	if username == "" {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		s.Log.Warnln("DeleteUser without user")
		return
	}

	s.Log.Infoln("Deleting user:", username)
	err := s.Database.DeleteUser(username)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		s.Log.Errorln("Cannot delete user:", username, err)
		return
	}

	w.Write([]byte("Ok"))
}

// LoggedInMiddleWare makes sure the request continues only if the user is logged in
func (s *Server) LoggedInMiddleware(handler http.HandlerFunc) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get cookie
		cookie, err := r.Cookie("user")
		if err != nil {
			http.Redirect(w, r, "/login", http.StatusTemporaryRedirect)
			return
		}

		claims, err := UserCookieFromJWT(s.parseJWTToken(cookie.Value))
		if err != nil {
			http.Redirect(w, r, "/login", http.StatusTemporaryRedirect)
			log.Errorln("Cannot parse jwt:", err)
			return
		}

		if claims.Username == "" {
			log.Errorln("Found jwt token without username:", cookie.Value)
			http.Redirect(w, r, "/login", http.StatusTemporaryRedirect)
			return
		}

		if claims.Expiration.Before(time.Now()) {
			log.Errorln("Found jwt token expired:", cookie.Value)
			http.Redirect(w, r, "/login", http.StatusTemporaryRedirect)
			return
		}

		handler.ServeHTTP(w, r)
	})
}

func (s *Server) MustBeAdminMiddleware(handler http.HandlerFunc) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("user")
		if err != nil {
			http.Redirect(w, r, "/login", http.StatusTemporaryRedirect)
			return
		}
		claims, err := UserCookieFromJWT(s.parseJWTToken(cookie.Value))
		if err != nil {
			http.Error(w, "Bad request", http.StatusBadRequest)
			log.Errorln("Cannot parse jwt:", err)
			return
		}

		if claims.Username == "" {
			log.Errorln("Found jwt token without username:", cookie.Value)
			http.Redirect(w, r, "/login", http.StatusTemporaryRedirect)
			return
		}

		if claims.Expiration.Before(time.Now()) {
			log.Errorln("Found jwt token expired:", cookie.Value)
			http.Redirect(w, r, "/login", http.StatusTemporaryRedirect)
			return
		}

		if claims.CompanyID >= 0 {
			log.Errorln("Not admin user tried priviledged endpoint:", claims)
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		handler.ServeHTTP(w, r)
	})
}

func (s *Server) parseJWTToken(rawJwt string) (jwt.MapClaims, error) {
	// Parse the jwt token
	token, err := jwt.Parse(rawJwt, func(token *jwt.Token) (any, error) {
		// Make sure it is using HMAC
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("wrong signing method: %v; expected: HMAC", token.Header["alg"])
		}

		return s.jwtSecret, nil
	})

	if err != nil {
		return nil, fmt.Errorf("cannot parse jwt token: %w", err)
	}

	// Assure the token is valid
	if !token.Valid {
		return nil, fmt.Errorf("cannot validate token: %w", err)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("cannot convert claims: %w", err)
	}

	return claims, nil
}
