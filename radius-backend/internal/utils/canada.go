package utils

import (
	"errors"
	"slices"
	"strings"
)

const GSTRatePer100000 int64 = 5000

func SalesTaxRatePer100000(province string) (int64, error) {
	switch province {
	case "Ontario":
		return 13000, nil
	case "New Brunswick", "Newfoundland and Labrador", "Prince Edward Island":
		return 15000, nil
	case "Nova Scotia":
		return 14000, nil
	case "British Columbia", "Manitoba":
		return 12000, nil
	case "Saskatchewan":
		return 11000, nil
	case "Quebec":
		return 14975, nil
	case "Alberta", "Northwest Territories", "Nunavut", "Yukon":
		return GSTRatePer100000, nil
	default:
		return 0, errors.New("unsupported province")
	}
}

var CanadianProvincesAndTerritories = []string{
	"Alberta",
	"British Columbia",
	"Manitoba",
	"New Brunswick",
	"Newfoundland and Labrador",
	"Nova Scotia",
	"Ontario",
	"Prince Edward Island",
	"Quebec",
	"Saskatchewan",
	"Northwest Territories",
	"Nunavut",
	"Yukon",
}

func NormalizeCanadianPostalCode(postalCode string) (string, error) {
	normalized := strings.ReplaceAll(strings.ToUpper(postalCode), " ", "")
	if len(normalized) != 6 {
		return "", errors.New("Invalid Format: Postal Code")
	}
	for i, c := range normalized {
		if i%2 == 1 && (c < '0' || c > '9') {
			return "", errors.New("Invalid Format: Postal Code")
		} else if i%2 == 0 && (c < 'A' || c > 'Z') {
			return "", errors.New("Invalid Format: Postal Code")
		}
	}
	return normalized, nil
}

func ValidateCanadianProvince(province string) error {
	if !slices.Contains(CanadianProvincesAndTerritories, province) {
		return errors.New("Invalid Format: Province")
	}
	return nil
}

func SanitizeLocation(province string, postalCode string) (string, string, error) {
	if err := ValidateCanadianProvince(province); err != nil {
		return "", "", err
	}
	normalizedPostal, err := NormalizeCanadianPostalCode(postalCode)
	if err != nil {
		return "", "", err
	}
	return province, normalizedPostal, nil
}
