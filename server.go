package main

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
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
	fmt.Fprintln(w, "<body>Progetto<br>")
	s.Database.Query("")
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
	row := s.Database.QueryRow(s.Database.Rebind("SELECT utente.password, utente.azienda_id, azienda.nome FROM utente JOIN azienda ON utente.azienda_id = azienda.id WHERE utente.nome=:1"), username)

	var (
		correctHash string
		aziendaId   int
		azienda     string
	)

	err := row.Scan(&correctHash, &aziendaId, &azienda)
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

	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user":      username,
		"aziendaId": aziendaId,
		"azienda":   azienda,
	})
	jwtTok, err := tok.SignedString(s.jwtSecret)
	if err != nil {
		log.Errorln("Cannot sign JWT token:", err)
	}

	log.Println("Login successfull")
	http.SetCookie(w, &http.Cookie{Name: "user", Value: jwtTok, HttpOnly: true, Expires: time.Now().AddDate(0, 0, 7)})
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

	orders, err := s.Database.Query(s.Database.Rebind(`
	SELECT ordine.ddt, produttore.nome as produttore_nome, destinatario.nome as destinatario_nome, MAX(stato.stato) as stato, MAX(stato.quando)
FROM ordine
 JOIN stato ON ordine.id = stato.ordine_id
 JOIN azienda produttore ON ordine.produttore_id = produttore.id
 JOIN azienda destinatario ON ordine.destinatario_id = destinatario.id
WHERE produttore.id = :1 or destinatario.id = :1
GROUP BY ordine.ddt, produttore.nome, destinatario.nome`), claims["aziendaId"].(float64))
	if err != nil {
		log.Errorln("Cannot retrieve orders:", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	for orders.Next() {
		var (
			ddt, produttoreName, destinatarioName, statoId, statoDate string
		)

		err := orders.Scan(&ddt, &produttoreName, &destinatarioName, &statoId, &statoDate)
		if err != nil {
			log.Errorln("Cannot scan row:", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		fmt.Fprintln(w, ddt, produttoreName, destinatarioName, statoId, statoDate)
	}
}

// LoggedInMiddleWare makes sure the request continues only if the user is logged in
func (s *Server) LoggedInMiddleware(handler http.HandlerFunc, redirectTo string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get cookie
		cookie, err := r.Cookie("user")
		if err != nil {
			log.Errorln("Cannot parse cookie:", err)
			http.Redirect(w, r, redirectTo, http.StatusTemporaryRedirect)
			return
		}

		claims, err := s.parseJWTToken(cookie.Value)
		if err != nil {
			http.Error(w, "Bad request", http.StatusBadRequest)
			return
		}

		if _, ok := claims["user"]; !ok {
			log.Errorln("Found jwt token without username:", cookie.Value)
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
