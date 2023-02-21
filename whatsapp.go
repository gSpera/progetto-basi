package main

import (
	"encoding/json"
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

	switch msg.Type {
	case "image":
		err := wa.onReceivedImage(msg)
		if err != nil {
			wa.log.Errorln("Cannot handle image:", err)
		}
	default:
		wa.client.SendMessage(wa.phoneNumberID, whatsapp.SendMessage{
			MessagingProduct: "whatsapp",
			Type:             "text",
			To:               msg.From,

			Text: &whatsapp.SendMessageText{
				Body: "Non ho capito",
			},
		})
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
	if err != nil {
		return fmt.Errorf("cannot decode image: %w", err)
	}

	log.Printf("Found %d qr codes in image", len(res))
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
			continue
		}

		err = wa.client.SendMessage(wa.phoneNumberID, whatsapp.SendMessage{
			MessagingProduct: "whatsapp",
			To:               msg.From,

			Text: &whatsapp.SendMessageText{
				Body: fmt.Sprintf("Consegnato ordine %s con successo\n*%s* %s", order, companyName, city),
			},
		})
		if err != nil {
			log.Errorln("Cannot send success message:", err)
			continue
		}
	}

	return nil
}
