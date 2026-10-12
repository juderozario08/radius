package websocket_test

import (
	"net/http/httptest"
	"testing"

	"radius/internal/websocket"
)

func TestCheckOriginFunc(t *testing.T) {
	tests := []struct {
		name       string
		allowed    []string
		failClosed bool
		origin     string
		want       bool
	}{
		{"debug empty list allows any origin", nil, false, "https://evil.example", true},
		{"debug empty list allows missing origin", nil, false, "", true},
		{"release empty list allows missing origin", nil, true, "", true},
		{"release empty list allows same origin", nil, true, "https://api.radius.test", true},
		{"release empty list rejects foreign origin", nil, true, "https://evil.example", false},
		{"release list allows listed origin", []string{"https://app.radius.test"}, true, "https://app.radius.test", true},
		{"release list rejects unlisted origin", []string{"https://app.radius.test"}, true, "https://evil.example", false},
		{"release list rejects missing origin", []string{"https://app.radius.test"}, true, "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "https://api.radius.test/api/v1/ws", nil)
			if tt.origin != "" {
				req.Header.Set("Origin", tt.origin)
			}
			if got := websocket.CheckOriginFunc(tt.allowed, tt.failClosed)(req); got != tt.want {
				t.Errorf("CheckOriginFunc() = %v, want %v", got, tt.want)
			}
		})
	}
}
