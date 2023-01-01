package main

import (
	"database/sql/driver"
	"time"
)

type SqlTime time.Time

func (s *SqlTime) Scan(src any) error {
	switch v := src.(type) {
	case string:
		t, err := time.Parse(time.RFC3339Nano, v)
		*s = SqlTime(t)
		return err
	default:
		panic("cannot scan SqlTime")
	}
}

func (s *SqlTime) String() string {
	return time.Time(*s).Format(time.RFC3339Nano)
}

func (s *SqlTime) Value() (driver.Value, error) {
	return s.String(), nil
}

func (s *SqlTime) MarshalJSON() ([]byte, error) {
	return []byte("\"" + s.String() + "\""), nil
}
