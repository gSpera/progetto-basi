//go:build !sqlite && !oracle

package main

import (
	"database/sql"
	"fmt"

	"github.com/jmoiron/sqlx"
)

type Database struct {
}

func DatabaseName() string {
	return "NO DATABASE SELECTED"
}

func NewDatabase() (Database, error) {
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
func (d Database) NewOrder(input NewOrderInput, assegno int) (sql.Result, error) {
	panic("no database selected")
}
