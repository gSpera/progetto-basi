package main

import (
	"net/http"
	"os"

	"github.com/jmoiron/sqlx"
	ora "github.com/sijms/go-ora/v2"
	log "github.com/sirupsen/logrus"
)

func main() {
	log.Println("Starting")

	log.Println("Connecting to database")
	url := ora.BuildUrl("localhost", 1521, "XEPDB1", "gs", "gs", map[string]string{})
	db, err := sqlx.Connect("oracle", url)
	if err != nil {
		log.Fatalln("Cannot connect to database:", err)
	}

	log.Println("Initializing server")
	server, err := NewServer(db, os.DirFS("./tmpl"), log.NewEntry(log.StandardLogger()))
	if err != nil {
		log.Fatalln("Cannot initialize server:", err)
	}
	log.Println("Registering handlers")
	http.HandleFunc("/", server.HandleHome)
	http.HandleFunc("/login", server.HandleLogin)

	log.Println("Listening")
	http.ListenAndServe(":8080", nil)
}
