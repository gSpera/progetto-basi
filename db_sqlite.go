//go:build sqlite

package main

import (
	"database/sql"
	"strings"

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
	db, err := sqlx.Connect("sqlite", dbPath)
	db.Mapper = reflectx.NewMapperFunc("sqlite", strings.ToLower)

	return Database{
		db: db,
	}, err
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
		`INSERT INTO ordine VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
		input.DDT, input.Order, input.Protocollo, input.Sender, input.Receiver, input.NumColli, assegno, input.Note)
}

func (d Database) NewAzienda(name string, role int, address sql.NullString, piva sql.NullString, codunivoco sql.NullString) (sql.Result, error) {
	return d.db.Exec(
		`INSERT INTO azienda VALUES (NULL, ?, ?, ?, ?, ?)`, role, name, address, piva, codunivoco)
}
