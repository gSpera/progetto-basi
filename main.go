package main

import (
	"flag"
	"net/http"
	"os"

	log "github.com/sirupsen/logrus"
)

func main() {
	log.Println("Starting")
	jwtSecret := flag.String("jwt-secret", "", "JWT token secret, 32 bytes")
	flag.Parse()

	if len(*jwtSecret) != 32 {
		log.Fatalln("Invalid jwt secret, not 32 bytes")
	}

	log.Println("Database Name:", DatabaseName())
	log.Println("Connecting to database")
	log.SetReportCaller(true)

	db, err := NewDatabase()
	if err != nil {
		log.Fatalln("Cannot connect to database:", err)
	}

	log.Println("Initializing server")
	server, err := NewServer(db, os.DirFS("./tmpl"), log.NewEntry(log.StandardLogger()), []byte(*jwtSecret))
	if err != nil {
		log.Fatalln("Cannot initialize server:", err)
	}

	log.Println("Registering handlers")
	http.Handle("/", server.LoggedInMiddleware(server.HandleHome, "/login"))
	http.HandleFunc("/login", server.HandleLogin)
	http.HandleFunc("/logout", server.HandleLogout)
	http.Handle("/api/info-order", server.LoggedInMiddleware(server.HandleApiInfoOrder, "/login"))
	http.Handle("/api/orders", server.LoggedInMiddleware(server.HandlerApiGetOrders, "/login"))
	http.Handle("/api/avaible-receivers", server.LoggedInMiddleware(server.HandlerApiReceivers, "/login"))
	http.Handle("/api/new-order", server.LoggedInMiddleware(server.HandleApiNewOrder, "/login"))
	http.Handle("/api/new-azienda", server.LoggedInMiddleware(server.HandleApiNewAzienda, "/login"))
	http.Handle("/api/me", server.LoggedInMiddleware(server.HandlerApiAboutMe, "/login"))

	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

	log.Println("Listening")
	http.ListenAndServe(":8080", nil)
}
