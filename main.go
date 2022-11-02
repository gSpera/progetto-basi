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
	http.Handle("/", server.LoggedInMiddleware(server.HandleHome, "/login"))
	http.HandleFunc("/login", server.HandleLogin)
	http.Handle("/api/orders", server.LoggedInMiddleware(server.HandlerApiGetOrders, "/login"))

	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("tmpl"))))

	log.Println("Listening")
	http.ListenAndServe(":8080", nil)
}
