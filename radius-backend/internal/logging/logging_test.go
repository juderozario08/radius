package logging

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"strings"
	"testing"
)

func TestContextHandler_AttachesRequestID(t *testing.T) {
	tests := []struct {
		name      string
		ctx       context.Context
		wantID    string
		wantField bool
	}{
		{name: "with request id", ctx: WithRequestID(context.Background(), "req-123"), wantID: "req-123", wantField: true},
		{name: "without request id", ctx: context.Background(), wantField: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var buf bytes.Buffer
			logger := New(&buf, "release", "info").With("component", "test")
			logger.InfoContext(tt.ctx, "hello", "key", "value")

			var record map[string]any
			if err := json.Unmarshal(buf.Bytes(), &record); err != nil {
				t.Fatalf("output is not JSON: %v (%q)", err, buf.String())
			}
			got, ok := record[RequestIDKey]
			if ok != tt.wantField {
				t.Fatalf("request_id present = %v, want %v (%v)", ok, tt.wantField, record)
			}
			if tt.wantField && got != tt.wantID {
				t.Fatalf("request_id = %v, want %q", got, tt.wantID)
			}
			if record["msg"] != "hello" || record["key"] != "value" || record["component"] != "test" {
				t.Fatalf("unexpected record: %v", record)
			}
		})
	}
}

func TestParseLevel(t *testing.T) {
	tests := []struct {
		input  string
		want   slog.Level
		wantOK bool
	}{
		{"", slog.LevelInfo, true},
		{"debug", slog.LevelDebug, true},
		{"WARN", slog.LevelWarn, true},
		{" error ", slog.LevelError, true},
		{"verbose", slog.LevelInfo, false},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got, ok := ParseLevel(tt.input)
			if got != tt.want || ok != tt.wantOK {
				t.Fatalf("ParseLevel(%q) = (%v, %v), want (%v, %v)", tt.input, got, ok, tt.want, tt.wantOK)
			}
		})
	}
}

func TestNew_FormatAndLevel(t *testing.T) {
	tests := []struct {
		name     string
		ginMode  string
		level    string
		wantJSON bool
		wantInfo bool
	}{
		{name: "release uses json", ginMode: "release", level: "info", wantJSON: true, wantInfo: true},
		{name: "debug uses text", ginMode: "debug", level: "info", wantJSON: false, wantInfo: true},
		{name: "warn level drops info", ginMode: "release", level: "warn", wantJSON: true, wantInfo: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var buf bytes.Buffer
			New(&buf, tt.ginMode, tt.level).Info("hello")
			out := buf.String()
			if (out != "") != tt.wantInfo {
				t.Fatalf("info emitted = %v, want %v", out != "", tt.wantInfo)
			}
			if tt.wantInfo && strings.HasPrefix(out, "{") != tt.wantJSON {
				t.Fatalf("json output = %v, want %v: %q", strings.HasPrefix(out, "{"), tt.wantJSON, out)
			}
		})
	}
}
