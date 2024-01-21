//go:build !sqlite && !oracle

package main

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
)

type Database struct {
}

func DatabaseName() string {
	return "NO DATABASE SELECTED"
}

func DatabaseArgDefault() string {
	return ""
}

func DatabaseArgUsage() string {
	return "COMPILE WITH -flags"
}

func NewDatabase(string) (Database, error) {
	return Database{}, fmt.Errorf("no database selected, build with a tag")
}

func (d Database) GetUserInfoByName(username string) *sql.Row {
	panic("no database selected")
}
func (d Database) LatestStatesFor(aziendaId int) (*sqlx.Rows, error) {
	panic("no database selected")
}
func (d Database) StatesForOrdine(ordineId int) (*sqlx.Rows, error) {
	panic("no database selected")
}
func (d Database) ViagginiForOrdine(ordineId int) (*sqlx.Rows, error) {
	panic("no database selected")
}
func (d Database) CompanyNameByID(companyID int) (*sqlx.Rows, error) {
	panic("no database selected")
}
func (d Database) NewOrder(input NewOrderInput, assegno int, fatturato int) (sql.Result, error) {
	panic("no database selected")
}
func (d Database) NewAzienda(name string, role int, address sql.NullString, piva sql.NullString, codunivoco sql.NullString, comune string, regioneID int) (sql.Result, error) {
	panic("no database selected")
}
func (d Database) AddStateToOrder(orderID int, newState int, when time.Time) (sql.Result, error) {
	panic("no database selected")
}
func (d Database) RetrieveOrderNote(orderID int) (string, error) {
	panic("no database selected")
}
func (d Database) UpdateArriveDate(orderID int, newDate time.Time) (sql.Result, error) {
	panic("no database selected")
}
func (d Database) DeleteOrder(orderID int) (sql.Result, error) {
	panic("no database selected")
}
func (d Database) EditOrder(order NewOrderInput) (sql.Result, error) {
	panic("no database selected")
}
func (d Database) LoadStampInfoFor(orderID int) *sqlx.Row {
	panic("no database selected")
}
func (d Database) InfoForCompany(companyID int) *sqlx.Row {
	panic("no database selected")
}
func (d Database) UpdateCompany(companyID int, name string, regionID int, city string, address string) (sql.Result, error) {
	panic("no database selected")
}
func (d Database) InfoForOrder(orderID int) *sqlx.Row {
	panic("no database selected")
}
