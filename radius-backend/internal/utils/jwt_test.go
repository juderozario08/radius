package utils_test

import (
	"radius/internal/utils"
	"testing"
)

func TestParseBearerToken(t *testing.T) {
	for _, tc := range []struct {
		header string
		want   string
		ok     bool
	}{
		{"Bearer abc.def.ghi", "abc.def.ghi", true},
		{"bearer abc.def.ghi", "abc.def.ghi", true},
		{"BEARER abc", "abc", true},
		{"", "", false},
		{"Bearer", "", false},
		{"Bearer ", "", false},
		{"Basic abc", "", false},
		{"Bearer abc def", "", false},
		{"abc", "", false},
	} {
		got, ok := utils.ParseBearerToken(tc.header)
		if got != tc.want || ok != tc.ok {
			t.Errorf("ParseBearerToken(%q) = (%q, %v), want (%q, %v)", tc.header, got, ok, tc.want, tc.ok)
		}
	}
}
