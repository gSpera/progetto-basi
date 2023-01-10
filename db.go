package main

import (
	"database/sql/driver"
	"fmt"
	"os"
	"time"
)

type SqlTime time.Time

var NilTime = SqlTime(time.UnixMicro(0))

func (s *SqlTime) Scan(src any) error {
	if src == nil {
		*s = NilTime
		return nil
	}

	switch v := src.(type) {
	case string:
		t, err := time.Parse(time.RFC3339Nano, v)
		if err != nil {
			t, err = time.Parse("2006-01-02 15:04:05", v)
			if err != nil {
				return err
			}
		}

		*s = SqlTime(t)
		return err
	case time.Time:
		*s = SqlTime(v)
		return nil

	default:
		fmt.Fprintf(os.Stderr, "Cannot scan SqlTime: %T(%v)\n", src, src)
		panic("cannot scan SqlTime")
	}
}

func (s SqlTime) String() string {
	return time.Time(s).Format(time.RFC3339Nano)
}

func (s SqlTime) Value() (driver.Value, error) {
	return s.String(), nil
}

func (s SqlTime) MarshalJSON() ([]byte, error) {
	return []byte("\"" + s.String() + "\""), nil
}
