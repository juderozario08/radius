// radius-backend/internal/utils/canada.go
package utils

import (
	"errors"
	"slices"
	"strings"
)

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
