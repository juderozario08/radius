package models

import (
	"bytes"
	"database/sql/driver"
	"errors"
	"fmt"
	"math"
	"math/big"
	"strconv"
	"strings"
)

type Money int64

var ErrInvalidMoney = errors.New("invalid money amount")

const (
	maxMoneyLiteralLength = 64
	maxMoneyExponent      = 30
)

var (
	centsPerUnit = big.NewInt(100)
	maxMoney     = big.NewInt(math.MaxInt64)
	minMoney     = big.NewInt(math.MinInt64)
)

func isDecimalLiteral(s string) bool {
	if len(s) == 0 || len(s) > maxMoneyLiteralLength {
		return false
	}
	mantissa, exponent, hasExponent := strings.Cut(strings.ToLower(s), "e")
	if hasExponent {
		exp, err := strconv.Atoi(exponent)
		if err != nil || exp > maxMoneyExponent || exp < -maxMoneyExponent {
			return false
		}
	}
	mantissa = strings.TrimPrefix(strings.TrimPrefix(mantissa, "-"), "+")
	whole, fraction, _ := strings.Cut(mantissa, ".")
	if whole == "" && fraction == "" {
		return false
	}
	for _, c := range whole + fraction {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}

func ParseMoney(s string) (Money, error) {
	if !isDecimalLiteral(s) {
		return 0, fmt.Errorf("%w: %q", ErrInvalidMoney, s)
	}
	r, ok := new(big.Rat).SetString(s)
	if !ok {
		return 0, fmt.Errorf("%w: %q", ErrInvalidMoney, s)
	}
	r.Mul(r, new(big.Rat).SetInt(centsPerUnit))
	quotient, remainder := new(big.Int).QuoRem(r.Num(), r.Denom(), new(big.Int))
	if new(big.Int).Mul(new(big.Int).Abs(remainder), big.NewInt(2)).Cmp(r.Denom()) >= 0 {
		quotient.Add(quotient, big.NewInt(int64(r.Num().Sign())))
	}
	if quotient.Cmp(maxMoney) > 0 || quotient.Cmp(minMoney) < 0 {
		return 0, fmt.Errorf("%w: %q out of range", ErrInvalidMoney, s)
	}
	return Money(quotient.Int64()), nil
}

func (m Money) Cents() int64 {
	return int64(m)
}

func (m Money) Times(quantity int) Money {
	return m * Money(quantity)
}

func (m Money) TaxAtRatePer100000(rate int64) Money {
	product := int64(m) * rate
	if product < 0 {
		return Money(-((-product + 50000) / 100000))
	}
	return Money((product + 50000) / 100000)
}

func (m Money) Prorate(part, whole Money) Money {
	if whole == 0 {
		return 0
	}
	numerator := new(big.Int).Mul(big.NewInt(int64(m)), big.NewInt(int64(part)))
	denominator := big.NewInt(int64(whole))
	quotient, remainder := new(big.Int).QuoRem(numerator, denominator, new(big.Int))
	if new(big.Int).Mul(new(big.Int).Abs(remainder), big.NewInt(2)).Cmp(new(big.Int).Abs(denominator)) >= 0 {
		quotient.Add(quotient, big.NewInt(int64(numerator.Sign()*denominator.Sign())))
	}
	return Money(quotient.Int64())
}

func (m Money) String() string {
	sign := ""
	cents := uint64(m)
	if m < 0 {
		sign = "-"
		cents = -cents
	}
	return fmt.Sprintf("%s%d.%02d", sign, cents/100, cents%100)
}

func (m Money) MarshalJSON() ([]byte, error) {
	return []byte(m.String()), nil
}

func (m *Money) UnmarshalJSON(data []byte) error {
	if bytes.Equal(data, []byte("null")) {
		return nil
	}
	text := string(data)
	if len(data) >= 2 && data[0] == '"' && data[len(data)-1] == '"' {
		unquoted, err := strconv.Unquote(text)
		if err != nil {
			return fmt.Errorf("%w: %s", ErrInvalidMoney, text)
		}
		text = unquoted
	}
	parsed, err := ParseMoney(text)
	if err != nil {
		return err
	}
	*m = parsed
	return nil
}

func (m *Money) Scan(src any) error {
	switch v := src.(type) {
	case string:
		parsed, err := ParseMoney(v)
		if err != nil {
			return err
		}
		*m = parsed
	case []byte:
		parsed, err := ParseMoney(string(v))
		if err != nil {
			return err
		}
		*m = parsed
	case int64:
		*m = Money(v * 100)
	case float64:
		parsed, err := ParseMoney(strconv.FormatFloat(v, 'f', -1, 64))
		if err != nil {
			return err
		}
		*m = parsed
	case nil:
		return fmt.Errorf("%w: cannot scan NULL into Money", ErrInvalidMoney)
	default:
		return fmt.Errorf("%w: cannot scan %T into Money", ErrInvalidMoney, src)
	}
	return nil
}

func (m Money) Value() (driver.Value, error) {
	return m.String(), nil
}
