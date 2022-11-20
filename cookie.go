package main

import (
	"time"

	"github.com/golang-jwt/jwt/v4"
)

type UserCookie struct {
	Username    string
	CompanyID   int
	CompanyName string
	CompanyRole int
	Expiration  time.Time
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
		CompanyRole: int(claims["companyRole"].(float64)),
		Expiration:  time.Unix(int64(claims["expiration"].(float64)), 0),
	}, nil
}

func (u UserCookie) Claims() jwt.MapClaims {
	return jwt.MapClaims{
		"user":        u.Username,
		"aziendaId":   u.CompanyID,
		"azienda":     u.CompanyName,
		"companyRole": u.CompanyRole,
		"expiration":  u.Expiration.Unix(),
	}
}
