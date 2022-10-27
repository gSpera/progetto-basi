package main

import (
	"bufio"
	"fmt"
	"os"

	"github.com/jmoiron/sqlx"
	ora "github.com/sijms/go-ora/v2"
)

func main() {
	url := ora.BuildUrl("localhost", 1521, "XEPDB1", "gs", "gs", map[string]string{})
	db, err := sqlx.Connect("oracle", url)
	if err != nil {
		panic(err)
	}

	var values []struct {
		Value int `db:"VALUE"`
		W     int `db:"W"`
	}
	err = db.Select(&values, "SELECT * FROM random")
	if err != nil {
		panic(err)
	}
	for _, v := range values {
		fmt.Println(v)
	}
	r := bufio.NewReader(os.Stdin)
	for {
		fmt.Print(": ")
		input, err := r.ReadString('\n')
		if err != nil {
			panic(err)
		}
		res, err := db.Exec(input)
		if err != nil {
			fmt.Println(err)
		}
		fmt.Println(res)
	}
}
