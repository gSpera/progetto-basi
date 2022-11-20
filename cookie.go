package main

import (
	"github.com/golang-jwt/jwt/v4"
)

type UserCookie struct {
	Username    string
	CompanyID   int
	CompanyName string
}

func UserCookieFromJWT(claims jwt.MapClaims, err error) (r UserCookie, e error) {
	defer func() {
		err := recover()
		if err != nil {
			e = err.(error)
		}
	}()

	if err != nil {
		return UserCookie{}, err
	}

	return UserCookie{
		Username:    claims["user"].(string),
		CompanyID:   int(claims["aziendaId"].(float64)),
		CompanyName: claims["azienda"].(string),
	}, nil
}

func (u UserCookie) Claims() jwt.MapClaims {
	return jwt.MapClaims{
		"user":      u.Username,
		"aziendaId": u.CompanyID,
		"azienda":   u.CompanyName,
	}
}
