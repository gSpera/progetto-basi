//go:build oracle

package main

import (
	"database/sql"

	"github.com/jmoiron/sqlx"
	ora "github.com/sijms/go-ora/v2"
)

type Database struct {
	db *sqlx.DB
}

func DatabaseName() string {
	return "Oracle"
}

func NewDatabase() (Database, error) {
	url := ora.BuildUrl("localhost", 1521, "XEPDB1", "gs", "gs", map[string]string{})
	db, err := sqlx.Connect("oracle", url)
	return Database{
		db: db,
	}, err
}

func (d Database) GetUserInfoByName(username string) *sql.Row {
	return d.db.QueryRow(
		d.db.Rebind("SELECT utente.password, utente.azienda_id, azienda.nome, azienda.ruolo FROM utente JOIN azienda ON utente.azienda_id = azienda.id WHERE utente.nome=:1"), username)
}

func (d Database) LatestStatesFor(aziendaId int) (*sqlx.Rows, error) {
	return d.db.Queryx(d.db.Rebind(`
		SELECT * FROM ultimi_stati
		WHERE (:1<0) or (produttore_id = :1 or destinatario_id = :1)
	`), aziendaId)
}

func (d Database) StatesForOrdine(ordineId int) (*sqlx.Rows, error) {
	return d.db.Queryx("SELECT stato_string.value as stato, stato as statoID, quando FROM stato JOIN stato_string ON stato_string.id=stato.stato WHERE ordine_id=:1", ordineId)
}

func (d Database) ViagginiForOrdine(ordineId int) (*sqlx.Rows, error) {
	return d.db.Queryx("SELECT partenza, destinazione, data_partenza, data_arrivo FROM viaggio WHERE id_ordine=:1", ordineId)
}

func (d Database) CompanyNameByID(companyID int) (*sqlx.Rows, error) {
	return d.db.Queryx(d.db.Rebind(`SELECT id, nome FROM azienda WHERE id >= 0 AND id != :1`), companyID)
}

func (d Database) NewOrder(input NewOrderInput, assegno int) (sql.Result, error) {
	return d.db.Exec(
		`INSERT INTO Ordine VALUES (ordine_seq.nextval, :1, :2, :3, :4, :5)`,
		input.DDT, input.Sender, input.Receiver, input.NumColli, assegno)
}
