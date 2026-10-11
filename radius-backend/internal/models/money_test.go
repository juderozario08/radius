package models_test

import (
	"encoding/json"
	"errors"
	"math"
	"radius/internal/models"
	"testing"
)

func TestParseMoney(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    models.Money
		wantErr bool
	}{
		{name: "whole dollars", input: "12", want: 1200},
		{name: "two decimals", input: "12.34", want: 1234},
		{name: "one decimal", input: "0.5", want: 50},
		{name: "float32 trap value", input: "16777217.01", want: 1677721701},
		{name: "tenths and hundredths sum exactly", input: "0.30", want: 30},
		{name: "rounds half up", input: "1.005", want: 101},
		{name: "rounds down below half", input: "1.004", want: 100},
		{name: "negative rounds half away from zero", input: "-1.005", want: -101},
		{name: "negative", input: "-35.50", want: -3550},
		{name: "leading plus", input: "+2.50", want: 250},
		{name: "fraction only", input: ".75", want: 75},
		{name: "exponent", input: "1.2345e2", want: 12345},
		{name: "tiny float noise rounds to zero", input: "5.551115123125783e-17", want: 0},
		{name: "empty", input: "", wantErr: true},
		{name: "letters", input: "12.3a", wantErr: true},
		{name: "rational form rejected", input: "1/3", wantErr: true},
		{name: "hex rejected", input: "0x10", wantErr: true},
		{name: "lone dot", input: ".", wantErr: true},
		{name: "huge exponent rejected", input: "1e999999999", wantErr: true},
		{name: "out of int64 range", input: "999999999999999999999", wantErr: true},
		{name: "NaN rejected", input: "NaN", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := models.ParseMoney(tt.input)
			if tt.wantErr {
				if !errors.Is(err, models.ErrInvalidMoney) {
					t.Fatalf("ParseMoney(%q) error = %v, want ErrInvalidMoney", tt.input, err)
				}
				return
			}
			if err != nil {
				t.Fatalf("ParseMoney(%q) unexpected error: %v", tt.input, err)
			}
			if got != tt.want {
				t.Errorf("ParseMoney(%q) = %d, want %d", tt.input, got, tt.want)
			}
		})
	}
}

func TestMoney_String(t *testing.T) {
	tests := []struct {
		money models.Money
		want  string
	}{
		{0, "0.00"},
		{5, "0.05"},
		{1234, "12.34"},
		{-50, "-0.50"},
		{-3550, "-35.50"},
		{math.MinInt64, "-92233720368547758.08"},
	}

	for _, tt := range tests {
		if got := tt.money.String(); got != tt.want {
			t.Errorf("Money(%d).String() = %q, want %q", tt.money, got, tt.want)
		}
	}
}

func TestMoney_TaxAtRatePer100000(t *testing.T) {
	tests := []struct {
		name     string
		subtotal models.Money
		rate     int64
		want     models.Money
	}{
		{name: "ontario 13%", subtotal: 10000, rate: 13000, want: 1300},
		{name: "british columbia 12%", subtotal: 1999, rate: 12000, want: 240},
		{name: "quebec 14.975% rounds half up", subtotal: 1000, rate: 14975, want: 150},
		{name: "quebec 14.975% rounds down", subtotal: 999, rate: 14975, want: 150},
		{name: "gst 5% half cent rounds up", subtotal: 10, rate: 5000, want: 1},
		{name: "gst 5% below half cent", subtotal: 9, rate: 5000, want: 0},
		{name: "negative amount rounds away from zero", subtotal: -10, rate: 5000, want: -1},
		{name: "zero", subtotal: 0, rate: 13000, want: 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.subtotal.TaxAtRatePer100000(tt.rate); got != tt.want {
				t.Errorf("Money(%d).TaxAtRatePer100000(%d) = %d, want %d", tt.subtotal, tt.rate, got, tt.want)
			}
		})
	}
}

func TestMoney_JSON(t *testing.T) {
	type payload struct {
		Amount   models.Money  `json:"amount"`
		Optional *models.Money `json:"optional"`
	}

	encoded, err := json.Marshal(payload{Amount: 1050})
	if err != nil {
		t.Fatal(err)
	}
	if string(encoded) != `{"amount":10.50,"optional":null}` {
		t.Errorf("Marshal = %s", encoded)
	}

	tests := []struct {
		name    string
		input   string
		want    models.Money
		wantErr bool
	}{
		{name: "number", input: `{"amount":19.99}`, want: 1999},
		{name: "integer", input: `{"amount":20}`, want: 2000},
		{name: "string", input: `{"amount":"19.99"}`, want: 1999},
		{name: "null leaves zero", input: `{"amount":null}`, want: 0},
		{name: "float noise from client", input: `{"amount":0.30000000000000004}`, want: 30},
		{name: "invalid string", input: `{"amount":"abc"}`, wantErr: true},
		{name: "boolean", input: `{"amount":true}`, wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var got payload
			err := json.Unmarshal([]byte(tt.input), &got)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("Unmarshal(%s) expected error", tt.input)
				}
				return
			}
			if err != nil {
				t.Fatalf("Unmarshal(%s) unexpected error: %v", tt.input, err)
			}
			if got.Amount != tt.want {
				t.Errorf("Unmarshal(%s) = %d, want %d", tt.input, got.Amount, tt.want)
			}
		})
	}
}

func TestMoney_Scan(t *testing.T) {
	tests := []struct {
		name    string
		src     any
		want    models.Money
		wantErr bool
	}{
		{name: "numeric text", src: "1234.56", want: 123456},
		{name: "numeric bytes", src: []byte("0.10"), want: 10},
		{name: "integer", src: int64(7), want: 700},
		{name: "float", src: float64(0.1), want: 10},
		{name: "null", src: nil, wantErr: true},
		{name: "unsupported type", src: true, wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var got models.Money
			err := got.Scan(tt.src)
			if tt.wantErr {
				if !errors.Is(err, models.ErrInvalidMoney) {
					t.Fatalf("Scan(%v) error = %v, want ErrInvalidMoney", tt.src, err)
				}
				return
			}
			if err != nil {
				t.Fatalf("Scan(%v) unexpected error: %v", tt.src, err)
			}
			if got != tt.want {
				t.Errorf("Scan(%v) = %d, want %d", tt.src, got, tt.want)
			}
		})
	}
}

func TestMoney_Value(t *testing.T) {
	value, err := models.Money(-1205).Value()
	if err != nil {
		t.Fatal(err)
	}
	if value != "-12.05" {
		t.Errorf("Value() = %v, want -12.05", value)
	}
}

func TestCreateTransactionRequest_IgnoresClientMoney(t *testing.T) {
	body := `{"register_id":"REG-01","subtotal":0.01,"tax_amount":0,"total_amount":0.01,"cost_total":0,"discount_total":999,
		"items":[{"product_id":1,"quantity":1,"unit_price":0.01,"unit_cost":0,"discount_amount":999}]}`

	var req models.CreateTransactionRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatal(err)
	}
	if req.Subtotal != 0 || req.TaxAmount != 0 || req.TotalAmount != 0 || req.CostTotal != 0 || req.DiscountTotal != 0 {
		t.Errorf("client totals were accepted: %+v", req)
	}
	if len(req.Items) != 1 || req.Items[0].UnitPrice != 0 || req.Items[0].UnitCost != 0 || req.Items[0].DiscountAmount != 0 {
		t.Errorf("client item prices were accepted: %+v", req.Items)
	}
}

func TestMoney_Prorate(t *testing.T) {
	tests := []struct {
		name  string
		value models.Money
		part  models.Money
		whole models.Money
		want  models.Money
	}{
		{name: "exact share", value: 1200, part: 5000, whole: 10000, want: 600},
		{name: "rounds down below half", value: 1340, part: 103, whole: 10309, want: 13},
		{name: "rounds half up", value: 3, part: 1, whole: 2, want: 2},
		{name: "negative rounds away from zero", value: -3, part: 1, whole: 2, want: -2},
		{name: "whole share", value: 1340, part: 10309, whole: 10309, want: 1340},
		{name: "zero whole", value: 1340, part: 103, whole: 0, want: 0},
		{name: "no int64 overflow", value: 9999999999, part: 9999999999, whole: 9999999999, want: 9999999999},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.value.Prorate(tt.part, tt.whole); got != tt.want {
				t.Errorf("Money(%d).Prorate(%d, %d) = %d, want %d", tt.value, tt.part, tt.whole, got, tt.want)
			}
		})
	}
}

func TestCreateReturnRequest_IgnoresClientMoney(t *testing.T) {
	body := `{"refund_method":"CASH","subtotal":999,"tax_amount":999,"total_refund":999,
		"items":[{"product_id":1,"quantity":1,"unit_price":999,"tax_amount":999,"return_reason":"DEFECTIVE","disposition":"RESTOCK"}]}`

	var req models.CreateReturnRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatal(err)
	}
	if req.Subtotal != 0 || req.TaxAmount != 0 || req.TotalRefund != 0 {
		t.Errorf("client totals were accepted: %+v", req)
	}
	if len(req.Items) != 1 || req.Items[0].UnitPrice != 0 || req.Items[0].TaxAmount != 0 {
		t.Errorf("client item prices were accepted: %+v", req.Items)
	}
}
