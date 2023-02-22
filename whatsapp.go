package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"net/http"

	"github.com/gSpera/whatsapp-business-api"
	"github.com/makiuchi-d/gozxing"
	"github.com/makiuchi-d/gozxing/multi/qrcode"
	log "github.com/sirupsen/logrus"
)

type ServerInterface interface {
	DeliverOrder(orderID int) (order, companyName, city string, err error)
}

type WhatsappAPI struct {
	log             *log.Entry
	webhookToken    string
	phoneNumberID   string
	client          whatsapp.Client
	serverInterface ServerInterface
	// allowedPhones   map[string]struct{}
}

func NewWhatsappAPI(log *log.Entry, webhookToken string, accessToken string, phoneNumberID string, serverInterface ServerInterface) *WhatsappAPI {
	return &WhatsappAPI{
		log:             log,
		webhookToken:    webhookToken,
		phoneNumberID:   phoneNumberID,
		client:          *whatsapp.NewClient(accessToken),
		serverInterface: serverInterface,
	}
}

func (wa *WhatsappAPI) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	wa.log.Println("Whatsapp request")

	// Check for webhook setup
	r.ParseForm()
	if r.FormValue("hub.mode") != "" {
		wa.setupWebhook(w, r)
		return
	}

	var content whatsapp.WebhookEntryObject
	decoder := json.NewDecoder(r.Body)
	decoder.Decode(&content)

	for _, entry := range content.Entry {
		wa.log.Println("Entry:", entry.ID)
		for _, change := range entry.Changes {
			for _, msg := range change.Value.Messages {
				wa.handleMessage(msg)
			}
		}
	}
}

func (wa *WhatsappAPI) setupWebhook(w http.ResponseWriter, r *http.Request) {
	wa.log.Println("Setup webhook")
	if r.FormValue("hub.mode") != "subscribe" {
		wa.log.Warnln("Unkown hub.mode")
		return
	}
	verifyToken := r.FormValue("hub.verify_token")
	if verifyToken != wa.webhookToken {
		wa.log.Warnln("Wrong verify token:", verifyToken)
	}

	wa.log.Println("Setup webhook, challenge:", r.FormValue("hub.challenge"))
	fmt.Fprintln(w, r.FormValue("hub.challenge"))
}

func (wa *WhatsappAPI) handleMessage(msg whatsapp.WebhookMessage) {
	wa.log.Printf("Received message from %s, type %s, timestamp %d", msg.From, msg.Type, msg.Timestamp)

	err := wa.client.SetMessageAsRead(wa.phoneNumberID, msg.ID)
	if err != nil {
		wa.log.Warnln("Cannot mark message message as read:", msg.ID, err)
	}

	switch msg.Type {
	case "image":
		err := wa.onReceivedImage(msg)
		if err != nil {
			wa.log.Errorln("Cannot handle image:", err)
			wa.client.SendSimpleMessage(wa.phoneNumberID, msg.From, "Sfortunatamente c'è stato qualche errore, potresti mandare un altra foto??")
		}
	default:
		wa.client.SendSimpleMessage(wa.phoneNumberID, msg.From, "Non ho capito")
	}
}

func (wa *WhatsappAPI) onReceivedImage(msg whatsapp.WebhookMessage) error {
	imgReader, err := wa.client.RetrieveMedia(msg.Image.ID)
	log := wa.log.WithField("image-id", msg.Image.ID)

	if err != nil {
		return fmt.Errorf("cannot retrieve image: %w", err)
	}

	img, _, err := image.Decode(imgReader)
	if err != nil {
		return fmt.Errorf("cannot decode image: %w", err)
	}

	scanner, err := gozxing.NewBinaryBitmapFromImage(img)
	if err != nil {
		return fmt.Errorf("cannot scan image: %w", err)
	}

	reader := qrcode.NewQRCodeMultiReader()
	res, err := reader.DecodeMultipleWithoutHint(scanner)
	if err != nil && !errors.Is(err, gozxing.NewNotFoundException()) {
		return fmt.Errorf("cannot decode image: %w", err)
	}

	if len(res) == 0 { // No QR Codes found
		log.Warnln("Image with no qr code")
		return fmt.Errorf("no qr code found")
	}

	log.Printf("Found %d qr codes in image", len(res))
	errs := make([]error, 0)
	for _, qr := range res {
		text := qr.GetText()
		log.Println("Found QR Code:", text)

		var orderID int
		_, err := fmt.Sscanf(text, "SPERA-LOGISTICA-ORDINE:%d", &orderID)
		if err != nil {
			log.Warnln("Invalid qr code:", text)
			continue
		}

		log.Println("Found order:", orderID)
		order, companyName, city, err := wa.serverInterface.DeliverOrder(orderID)
		if err != nil {
			log.Errorln("Cannot deliver package:", err)
			errs = append(errs, err)
			continue
		}

		err = wa.client.SendSimpleMessage(wa.phoneNumberID, msg.From, fmt.Sprintf("Consegnato ordine %s con successo\n*%s* %s", order, companyName, city))
		if err != nil {
			log.Errorln("Cannot send success message:", err)
			errs = append(errs, err)
			continue
		}
	}

	if len(errs) != 0 {
		return fmt.Errorf("cannot deliver orders: %w", errors.Join(errs...))
	}

	return nil
}
