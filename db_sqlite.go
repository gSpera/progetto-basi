//go:build sqlite

package main

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/jmoiron/sqlx/reflectx"
	_ "modernc.org/sqlite"
)

type Database struct {
	db *sqlx.DB
}

func DatabaseName() string {
	return "SQLite"
}

func DatabaseArgDefault() string {
	return "database.db"
}

func DatabaseArgUsage() string {
	return "db path"
}

func NewDatabase(dbPath string) (Database, error) {
	db, err := sqlx.Connect("sqlite", dbPath+"?_pragma=busy_timeout(1000)")
	if err != nil {
		return Database{}, fmt.Errorf("cannot connect: %w", err)
	}
	db.Mapper = reflectx.NewMapperFunc("sqlite", strings.ToLower)

	return Database{
		db: db,
	}, nil
}

func (d Database) GetUserInfoByName(username string) *sql.Row {
	return d.db.QueryRow(
		d.db.Rebind("SELECT utente.password, utente.azienda_id, azienda.nome, azienda.ruolo FROM utente JOIN azienda ON utente.azienda_id = azienda.id WHERE utente.nome=?"), username)
}
func (d Database) LatestStatesFor(aziendaId int) (*sqlx.Rows, error) {
	return d.db.Queryx(d.db.Rebind(`
		SELECT * FROM ultimi_stati
		WHERE (?<0) or (produttore_id = ? or destinatario_id = ?)
	`), aziendaId, aziendaId, aziendaId)
}
func (d Database) StatesForOrdine(ordineId int) (*sqlx.Rows, error) {
	return d.db.Queryx("SELECT stato_string.value as stato, stato as statoID, quando FROM stato JOIN stato_string ON stato_string.id=stato.stato WHERE ordine_id=?", ordineId)
}
func (d Database) ViagginiForOrdine(ordineId int) (*sqlx.Rows, error) {
	return d.db.Queryx("SELECT partenza, destinazione, data_partenza, data_arrivo FROM viaggio WHERE id_ordine=?", ordineId)
}
func (d Database) CompanyNameByID(companyID int) (*sqlx.Rows, error) {
	return d.db.Queryx(d.db.Rebind(`SELECT id, nome FROM azienda WHERE id >= 0 AND id != ?`), companyID)
}
func (d Database) NewOrder(input NewOrderInput, assegno int) (sql.Result, error) {
	return d.db.Exec(
		`INSERT INTO ordine VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		input.DDT, input.Order, input.Protocollo, input.Sender, input.ReceiverID, input.NumColli, assegno, input.Carrier, input.CreationDate, input.ArriveDate, input.Note)
}
func (d Database) NewAzienda(name string, role int, address sql.NullString, piva sql.NullString, codunivoco sql.NullString, comune string, regioneID int) (sql.Result, error) {
	return d.db.Exec(
		`INSERT INTO azienda VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)`, role, name, address, comune, regioneID, piva, codunivoco)
}
func (d Database) AddStateToOrder(orderID int, newState int, when time.Time) (sql.Result, error) {
	return d.db.Exec(
		`INSERT INTO stato VALUES (NULL, ?, ?, ?)`, orderID, newState, SqlTime(when))
}
func (d Database) RetrieveOrderNote(orderID int) (string, error) {
	var note string
	r := d.db.QueryRow(`SELECT note FROM ordine WHERE id=?`, orderID)
	err := r.Scan(&note)
	return note, err
}
func (d Database) UpdateArriveDate(orderID int, newDate time.Time) (sql.Result, error) {
	return d.db.Exec(`UPDATE ordine SET data_consegna=? WHERE id=?`, SqlTime(newDate), orderID)
}
func (d Database) DeleteOrder(orderID int) (sql.Result, error) {
	return d.db.Exec(`DELETE FROM ordine WHERE id=?`, orderID)
}
func (d Database) EditOrder(order NewOrderInput) (sql.Result, error) {
	var assegno int
	if order.Assegno {
		assegno = 1
	}

	return d.db.Exec(
		`UPDATE ordine SET ddt=?, ordine=?, protocollo=?, produttore_id=?, destinatario_id=?, num_colli=?, ritirare_assegno=?, trasportatore=?, data_creazione=?, data_consegna=?, note=? WHERE id=?`,
		order.DDT, order.Order, order.Protocollo, order.Sender, order.ReceiverID, order.NumColli, assegno, order.Carrier, order.CreationDate, order.ArriveDate, order.Note, order.OrderID)
}
func (d Database) LoadStampInfoFor(orderID int) *sqlx.Row {
	return d.db.QueryRowx(`SELECT o.id AS ordine_id, o.ordine, o.ddt, o.num_colli, o.ritirare_assegno, a.id AS azienda_id, a.nome, regione_string.value AS regione, a.comune, a.indirizzo FROM ordine o JOIN azienda a ON o.destinatario_id=a.id JOIN regione_string ON a.regione = regione_string.id WHERE o.id=?`, orderID)
}

func (d Database) InfoForCompany(companyID int) *sqlx.Row {
	return d.db.QueryRowx(`SELECT nome, indirizzo, comune, regione FROM azienda WHERE id=?`, companyID)
}

func (d Database) UpdateCompany(companyID int, name string, regionID int, city string, address string) (sql.Result, error) {
	return d.db.Exec(`UPDATE azienda SET nome=?, regione=?, comune=?, indirizzo=? WHERE id=?`, name, regionID, city, address, companyID)
}
func (d Database) InfoForOrder(orderID int) *sqlx.Row {
	return d.db.QueryRowx(`SELECT o.ordine, d.nome, d.comune FROM ordine o JOIN azienda d ON o.destinatario_id=d.id WHERE o.id=?`, orderID)
}
