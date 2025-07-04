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

	WhatsAppAccessToken       string
	WhatsAppWebhookVerifyCode string
	WhatsAppPhoneNumberID     string
}

type UserRole int

const (
	UserRoleRegion = 3 // A Region
	UserRoleZone   = 4 // Multiple Store
	UserRoleStore  = 5 // A single Store

	UserRoleMaxValue = UserRoleStore
)

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

	log.Println("Initializing whatsapp business api")
	whatsapp := NewWhatsappAPI(
		log.WithField("what", "whatsapp"),
		cfg.WhatsAppWebhookVerifyCode,
		cfg.WhatsAppAccessToken,
		cfg.WhatsAppPhoneNumberID,
		&server,
	)

	log.Println("Registering handlers")
	http.Handle("/", server.LoggedInMiddleware(server.HandleHome))
	http.Handle("/utenze", server.LoggedInMiddleware(server.HandleManageUsers))
	http.Handle("/export.csv", server.LoggedInMiddleware(server.HandleExportCsv))
	http.HandleFunc("/login", server.HandleLogin)
	http.HandleFunc("/logout", server.HandleLogout)
	http.Handle("/api/info-order", server.LoggedInMiddleware(server.HandleApiInfoOrder))
	http.Handle("/api/orders", server.LoggedInMiddleware(server.HandlerApiGetOrders))
	http.Handle("/api/avaible-receivers", server.LoggedInMiddleware(server.HandlerApiReceivers))
	http.Handle("/api/new-order", server.MustBeAdminMiddleware(server.HandleApiNewOrder))
	http.Handle("/api/new-azienda", server.MustBeAdminMiddleware(server.HandleApiNewAzienda))
	http.Handle("/api/info-for-company", server.LoggedInMiddleware(server.HandleApiInfoForCompany))
	http.Handle("/api/users-for-company", server.LoggedInMiddleware(server.HandleApiUsersForCompany))
	http.Handle("/api/update-azienda", server.MustBeAdminMiddleware(server.HandleApiUpdateCompany))
	http.Handle("/api/update-order", server.MustBeAdminMiddleware(server.HandleApiUpdateOrder))
	http.Handle("/api/update-arrive-date", server.MustBeAdminMiddleware(server.HandleApiUpdateArriveDate))
	http.Handle("/api/delete-order", server.MustBeAdminMiddleware(server.HandleApiDeleteOrder))
	http.Handle("/api/edit-order", server.MustBeAdminMiddleware(server.HandleApiEditOrder))
	http.Handle("/api/retrieve-note", server.MustBeAdminMiddleware(server.HandleApiRetrieveNote))
	http.Handle("/api/attachments", server.LoggedInMiddleware(server.HandleApiRetrieveAttachments))
	http.Handle("/api/put-attachment", server.MustBeAdminMiddleware(server.HandleApiUploadFile))
	http.Handle("/api/delete-attachment", server.MustBeAdminMiddleware(server.HandleApiDeleteAttachment))
	http.Handle("/api/attachment-icons", server.LoggedInMiddleware(server.HandleApiAttachmentIcons))
	http.Handle("/attachments/", server.LoggedInMiddleware(server.HandleRetrieveAttachment))
	http.Handle("/stamp/", server.LoggedInMiddleware(server.HandlePrintStamp))
	http.Handle("/api/me", server.LoggedInMiddleware(server.HandlerApiAboutMe))

	http.Handle("/api/qrcode-stamp", server.MustBeAdminMiddleware(server.HandleApiQRCodeForStamp))
	http.Handle("/api/whatsapp-webhook", whatsapp)

	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

	log.Println("Listening:", cfg.ListenAddress)
	http.ListenAndServe(cfg.ListenAddress, nil)
}
