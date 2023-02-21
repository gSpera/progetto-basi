package main

import (
	"encoding/json"
	"flag"
	"net/http"
	"os"

	log "github.com/sirupsen/logrus"
)

type Config struct {
	JWTSecret     string
	ListenAddress string
	DatabaseArg   string
}

func main() {
	log.Println("Starting")
	var cfg Config
	cfgFile := flag.String("cfg", "config.json", "Config file")
	flag.Parse()

	cfgBody, err := os.ReadFile(*cfgFile)
	if err != nil {
		log.Errorln("Cannot read config file:", err)
		return
	}
	err = json.Unmarshal(cfgBody, &cfg)
	if err != nil {
		log.Errorln("Cannot unmarshal config:", err)
		return
	}

	if len(cfg.JWTSecret) != 32 {
		log.Fatalln("Invalid jwt secret, not 32 bytes")
	}

	log.Println("Database Name:", DatabaseName())
	log.Println("Connecting to database")
	log.Println("Database Argument:", cfg.DatabaseArg)
	log.SetReportCaller(true)

	db, err := NewDatabase(cfg.DatabaseArg)
	if err != nil {
		log.Fatalln("Cannot connect to database:", err)
	}

	err = os.MkdirAll("attachments", 0744)
	if err != nil {
		log.Fatalln("Cannot create attachments directory:", err)
	}
	attachmentsFS := "attachments"
	attachmentStore := FileSystemAttachmentStore{attachmentsFS}

	log.Println("Initializing server")
	server, err := NewServer(db, attachmentStore, os.DirFS("./tmpl"), log.NewEntry(log.StandardLogger()), []byte(cfg.JWTSecret))
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
	http.Handle("/api/info-for-company", server.LoggedInMiddleware(server.HandleApiInfoForCompany, "/login"))
	http.Handle("/api/update-azienda", server.LoggedInMiddleware(server.HandleApiUpdateCompany, "/login"))
	http.Handle("/api/update-order", server.LoggedInMiddleware(server.HandleApiUpdateOrder, "/login"))
	http.Handle("/api/update-arrive-date", server.LoggedInMiddleware(server.HandleApiUpdateArriveDate, "/login"))
	http.Handle("/api/delete-order", server.LoggedInMiddleware(server.HandleApiDeleteOrder, "/login"))
	http.Handle("/api/edit-order", server.LoggedInMiddleware(server.HandleApiEditOrder, "/login"))
	http.Handle("/api/retrieve-note", server.LoggedInMiddleware(server.HandleApiRetrieveNote, "/login"))
	http.Handle("/api/attachments", server.LoggedInMiddleware(server.HandleApiRetrieveAttachments, "/login"))
	http.Handle("/api/put-attachment", server.LoggedInMiddleware(server.HandleApiUploadFile, "/login"))
	http.Handle("/api/delete-attachment", server.LoggedInMiddleware(server.HandleApiDeleteAttachment, "/login"))
	http.Handle("/api/attachment-icons", server.LoggedInMiddleware(server.HandleApiAttachmentIcons, "/login"))
	http.Handle("/attachments/", server.LoggedInMiddleware(server.HandleRetrieveAttachment, "/login"))
	http.Handle("/stamp/", server.LoggedInMiddleware(server.HandlePrintStamp, "/login"))
	http.Handle("/api/me", server.LoggedInMiddleware(server.HandlerApiAboutMe, "/login"))

	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

	log.Println("Listening:", cfg.ListenAddress)
	http.ListenAndServe(cfg.ListenAddress, nil)
}
