package main

import (
	"flag"
	"fmt"
	"net/http"
	"os"

	log "github.com/sirupsen/logrus"
)

func main() {
	log.Println("Starting")
	jwtSecret := flag.String("jwt-secret", "", "JWT token secret, 32 bytes")
	listen := flag.String("addr", ":8080", "address used to listen")
	databaseArg := flag.String("db", DatabaseArgDefault(), fmt.Sprintf("argument to db (%s): %s", DatabaseName(), DatabaseArgUsage()))
	flag.Parse()

	if len(*jwtSecret) != 32 {
		log.Fatalln("Invalid jwt secret, not 32 bytes")
	}

	log.Println("Database Name:", DatabaseName())
	log.Println("Connecting to database")
	log.Println("Database Argument:", *databaseArg)
	log.SetReportCaller(true)

	db, err := NewDatabase(*databaseArg)
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
	http.Handle("/api/update-order", server.LoggedInMiddleware(server.HandleApiUpdateOrder, "/login"))
	http.Handle("/api/update-arrive-date", server.LoggedInMiddleware(server.HandleApiUpdateArriveDate, "/login"))
	http.Handle("/api/me", server.LoggedInMiddleware(server.HandlerApiAboutMe, "/login"))

	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

	log.Println("Listening:", *listen)
	http.ListenAndServe(*listen, nil)
}
