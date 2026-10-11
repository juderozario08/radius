package utils_test

import (
	"radius/internal/utils"
	"testing"
)

func TestSalesTaxRatePer100000(t *testing.T) {
	tests := []struct {
		province string
		want     int64
		wantErr  bool
	}{
		{province: "Ontario", want: 13000},
		{province: "New Brunswick", want: 15000},
		{province: "Newfoundland and Labrador", want: 15000},
		{province: "Prince Edward Island", want: 15000},
		{province: "Nova Scotia", want: 14000},
		{province: "British Columbia", want: 12000},
		{province: "Manitoba", want: 12000},
		{province: "Saskatchewan", want: 11000},
		{province: "Quebec", want: 14975},
		{province: "Alberta", want: 5000},
		{province: "Northwest Territories", want: 5000},
		{province: "Nunavut", want: 5000},
		{province: "Yukon", want: 5000},
		{province: "BC", wantErr: true},
		{province: "", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.province, func(t *testing.T) {
			got, err := utils.SalesTaxRatePer100000(tt.province)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("utils.SalesTaxRatePer100000(%q) expected error", tt.province)
				}
				return
			}
			if err != nil {
				t.Fatalf("utils.SalesTaxRatePer100000(%q) unexpected error: %v", tt.province, err)
			}
			if got != tt.want {
				t.Errorf("utils.SalesTaxRatePer100000(%q) = %d, want %d", tt.province, got, tt.want)
			}
		})
	}
}

func TestSalesTaxRatePer100000_CoversEveryProvince(t *testing.T) {
	for _, province := range utils.CanadianProvincesAndTerritories {
		if _, err := utils.SalesTaxRatePer100000(province); err != nil {
			t.Errorf("utils.SalesTaxRatePer100000(%q) returned error: %v", province, err)
		}
	}
}
