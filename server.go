package main

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"html/template"
	"io/fs"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"github.com/jmoiron/sqlx"
	log "github.com/sirupsen/logrus"
)

type Server struct {
	jwtSecret []byte

	Database *sqlx.DB
	Template *template.Template
	Log      *log.Entry
}

func NewServer(db *sqlx.DB, tmplDir fs.FS, logger *log.Entry) (Server, error) {
	tmpl := template.New("html")
	_, err := tmpl.ParseFS(tmplDir, "*.tmpl")
	if err != nil {
		return Server{}, fmt.Errorf("cannot parse template: %w", err)
	}

	return Server{
		Database:  db,
		Template:  tmpl,
		Log:       logger,
		jwtSecret: SERVER_SECRET[:],
	}, nil
}

func (s *Server) HandleHome(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "tmpl/ordini.html")
}

func (s *Server) HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		err := s.Template.ExecuteTemplate(w, "login.tmpl", nil)
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			s.Log.Errorln("Rendering login template: ", err)
		}
		return
	}

	// Not the best, not secure
	r.ParseForm()
	username := r.PostForm.Get("username")
	password := r.PostForm.Get("password")
	row := s.Database.QueryRow(s.Database.Rebind("SELECT utente.password, utente.azienda_id, azienda.nome, azienda.ruolo FROM utente JOIN azienda ON utente.azienda_id = azienda.id WHERE utente.nome=:1"), username)

	var (
		correctHash string
		aziendaId   int
		azienda     string
		aziendaRole int
	)

	err := row.Scan(&correctHash, &aziendaId, &azienda, &aziendaRole)
	if err == sql.ErrNoRows {
		fmt.Fprintln(w, "Utente non trovato")
		log.Warningln("User not found")
		return
	} else if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		log.Errorln("Cannot query password:", err)
		return
	}

	hashBytes := sha256.Sum256([]byte(password))
	hash := hex.EncodeToString(hashBytes[:])

	if hash != correctHash {
		fmt.Fprintln(w, "Password sbagliata")
		log.Warningf("Wrong password: given: %s(%q), expected: %s\n", hash, password, correctHash)
		return
	}

	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, UserCookie{
		Username:    username,
		CompanyID:   aziendaId,
		CompanyName: azienda,
		CompanyRole: aziendaRole,
		Expiration:  time.Now().AddDate(0, 0, 7),
	}.Claims())
	jwtTok, err := tok.SignedString(s.jwtSecret)
	if err != nil {
		log.Errorln("Cannot sign JWT token:", err)
	}

	log.Println("Login successfull")
	http.SetCookie(w, &http.Cookie{Name: "user", Value: jwtTok, HttpOnly: true, Expires: time.Now().AddDate(0, 0, 7)})
	http.Redirect(w, r, "/", http.StatusTemporaryRedirect)
}

func (s *Server) HandleLogout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{Name: "user", Value: "", HttpOnly: true, Expires: time.Now().AddDate(0, 0, -1)})
	http.Redirect(w, r, "/", http.StatusTemporaryRedirect)
}

func (s *Server) HandlerApiGetOrders(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("user")
	if err != nil {
		log.Errorln("Cannot parse cookie:", err)
		http.Error(w, "Login first", http.StatusUnauthorized)
		return
	}

	claims, err := s.parseJWTToken(cookie.Value)
	if err != nil {
		log.Errorln("Cannot parse jwt:", err)
		http.Error(w, "Invalid jwt", http.StatusBadRequest)
		return
	}

	type Order struct {
		ID                int       `db:"ID"`
		DDT               string    `db:"DDT"`
		ProducerName      string    `db:"PRODUTTORE_NOME"`
		RecipientName     string    `db:"DESTINATARIO_NOME"`
		NumPackages       int       `db:"NUM_COLLI"`
		WithdrawBankCheck bool      `db:"RITIRARE_ASSEGNO"`
		StateID           int       `db:"STATO"`
		StateString       string    `db:"STATO_STRING"`
		When              time.Time `db:"QUANDO"`
	}
	result := make([]Order, 0, 10)

	orders, err := s.Database.Queryx(s.Database.Rebind(`
		SELECT * FROM ultimi_stati
		WHERE (:1<0) or (produttore.id = :1 or destinatario.id = :1)
	`), claims["aziendaId"].(float64))
	if err != nil {
		log.Errorln("Cannot retrieve orders:", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer orders.Close()

	for orders.Next() {
		var order Order
		err := orders.StructScan(&order)
		if err != nil {
			log.Errorln("Cannot scan row:", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
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

func (s *Server) HandleApiInfoOrder(w http.ResponseWriter, r *http.Request) {
	type stateRes struct {
		State   string    `db:"STATO"`
		StateID int       `db:"STATOID"`
		When    time.Time `db:"QUANDO"`
	}
	type viaggioRes struct {
		StartDate    time.Time `db:"DATA_PARTENZA"`
		EndDate      time.Time `db:"DATA_ARRIVO"`
		Partenza     string    `db:"PARTENZA"`
		Destinazione string    `db:"DESTINAZIONE"`
		Motrice      string    `db:"MOTRICE"`
	}
	states := make([]stateRes, 0, 7)
	viaggios := make([]viaggioRes, 0, 7)
	r.ParseForm()
	id := r.Form.Get("id")

	statesQuery, err := s.Database.Queryx("SELECT stato_string.value as stato, stato as statoID, quando FROM stato JOIN stato_string ON stato_string.id=stato.stato WHERE ordine_id=:1", id)
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

	viaggioQuery, err := s.Database.Queryx("SELECT partenza, destinazione, data_partenza, data_arrivo FROM viaggio WHERE id_ordine=:1", id)
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

	encoder := json.NewEncoder(w)
	encoder.SetIndent("", "\t")
	err = encoder.Encode(struct {
		States []stateRes
		Viaggi []viaggioRes
	}{
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
	}

	cookie, _ := r.Cookie("user")
	claims, _ := UserCookieFromJWT(s.parseJWTToken(cookie.Value))

	result.CompanyID = claims.CompanyID
	result.CompanyName = claims.CompanyName
	result.CompanyRole = claims.CompanyRole
	result.Username = claims.Username

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
		Name string `db:"NOME"`
	}

	var result struct {
		ShowSender bool
		Receivers  []receiver
	}

	cookie, _ := r.Cookie("user")
	claims, _ := UserCookieFromJWT(s.parseJWTToken(cookie.Value))

	result.ShowSender = claims.CompanyID < 0
	orders, err := s.Database.Queryx(s.Database.Rebind(`SELECT id, nome FROM azienda WHERE id >= 0 AND id != :1`), claims.CompanyID)
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

func (s *Server) HandleApiNewOrder(w http.ResponseWriter, r *http.Request) {
	input := struct {
		Sender   int `json:",string"`
		Receiver int `json:",string"`
		DDT      string
		NumColli int
		Assegno  bool
	}{}

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

	if input.DDT == "" {
		http.Error(w, "Invalid Request", http.StatusBadRequest)
		return
	}

	res, err := s.Database.Exec(
		`INSERT INTO Ordine VALUES (ordine_seq.nextval, :1, :2, :3, :4, :5)`,
		input.DDT, input.Sender, input.Receiver, input.NumColli, assegno)
	if err != nil {
		s.Log.Errorln("Cannot insert order:", err, res)
		http.Error(w, "Invalid Request", http.StatusBadRequest)
		return
	}

	s.Log.Println(input)
}

// LoggedInMiddleWare makes sure the request continues only if the user is logged in
func (s *Server) LoggedInMiddleware(handler http.HandlerFunc, redirectTo string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get cookie
		cookie, err := r.Cookie("user")
		if err != nil {
			log.Errorln("Cannot retrieve cookie:", err)
			http.Redirect(w, r, redirectTo, http.StatusTemporaryRedirect)
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
			http.Redirect(w, r, redirectTo, http.StatusTemporaryRedirect)
			return
		}

		if claims.Expiration.Before(time.Now()) {
			log.Errorln("Found jwt token expired:", cookie.Value)
			http.Redirect(w, r, redirectTo, http.StatusTemporaryRedirect)
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
