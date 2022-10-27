package main

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"html/template"
	"io/fs"
	"net/http"

	"github.com/davecgh/go-spew/spew"
	"github.com/golang-jwt/jwt/v4"
	"github.com/jmoiron/sqlx"
	log "github.com/sirupsen/logrus"
)

type Server struct {
	mux       *http.ServeMux
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

	var jwtSecret [32]byte
	_, err = rand.Read(jwtSecret[:])
	if err != nil {
		return Server{}, fmt.Errorf("cannot generate JWT secret: %w", err)
	}

	return Server{
		mux:       http.NewServeMux(),
		Database:  db,
		Template:  tmpl,
		Log:       logger,
		jwtSecret: jwtSecret[:],
	}, nil
}

func (s *Server) HandleHome(w http.ResponseWriter, r *http.Request) {
	var values []struct {
		Value int `db:"VALUE"`
		W     int `db:"W"`
	}

	err := s.Database.Select(&values, "SELECT * FROM random")
	if err != nil {
		r.Response.StatusCode = http.StatusInternalServerError
		fmt.Fprintln(w, "Internal server error")
		return
	}

	fmt.Fprintln(w, "<body>Progetto<br>")

	for _, v := range values {
		fmt.Fprintf(w, "%d, %d<br>\n", v.Value, v.W)
	}
}

func (s *Server) HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		err := s.Template.ExecuteTemplate(w, "login.tmpl", nil)
		if err != nil {
			s.Log.Errorln("Rendering login template: ", err)
		}
		return
	}

	// Not the best, not secure
	r.ParseForm()
	username := r.PostForm.Get("username")
	password := r.PostForm.Get("password")
	row := s.Database.QueryRow(s.Database.Rebind("SELECT (password) FROM utenti WHERE username=:1"), username)
	var correctHash string
	err := row.Scan(&correctHash)
	if err == sql.ErrNoRows {
		fmt.Fprintln(w, "Utente non trovato")
		log.Warningln("User not found")
		return
	} else if err != nil {
		fmt.Fprintln(w, "Internal Server Error")
		log.Errorln("Cannot query password:", err)
		return
	}

	hashBytes := sha256.Sum256([]byte(password))
	hash := hex.EncodeToString(hashBytes[:])

	if hash != correctHash {
		fmt.Fprintln(w, "Password sbagliata")
		log.Warningf("Wrong password: given: %s(%q), expected: %s\n", hash, password, correctHash)
		spew.Dump(hash)
		spew.Dump(correctHash)
		return
	}

	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user": username,
	})
	jwtTok, err := tok.SignedString(s.jwtSecret)
	if err != nil {
		log.Errorln("Cannot sign JWT token:", err)
	}

	log.Println("Login successfull")
	http.SetCookie(w, &http.Cookie{Name: "user", Value: jwtTok})
	http.Redirect(w, r, "/", http.StatusTemporaryRedirect)
}
