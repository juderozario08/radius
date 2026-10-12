package logging

import (
	"context"
	"io"
	"log/slog"
	"os"
	"strings"
)

const RequestIDKey = "request_id"

type requestIDContextKey struct{}

func WithRequestID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, requestIDContextKey{}, id)
}

func RequestID(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	id, _ := ctx.Value(requestIDContextKey{}).(string)
	return id
}

type ContextHandler struct {
	slog.Handler
}

func (h ContextHandler) Handle(ctx context.Context, r slog.Record) error {
	if id := RequestID(ctx); id != "" {
		r.AddAttrs(slog.String(RequestIDKey, id))
	}
	return h.Handler.Handle(ctx, r)
}

func (h ContextHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return ContextHandler{h.Handler.WithAttrs(attrs)}
}

func (h ContextHandler) WithGroup(name string) slog.Handler {
	return ContextHandler{h.Handler.WithGroup(name)}
}

func ParseLevel(value string) (slog.Level, bool) {
	if strings.TrimSpace(value) == "" {
		return slog.LevelInfo, true
	}
	var level slog.Level
	if err := level.UnmarshalText([]byte(strings.TrimSpace(value))); err != nil {
		return slog.LevelInfo, false
	}
	return level, true
}

func New(w io.Writer, ginMode, level string) *slog.Logger {
	parsed, _ := ParseLevel(level)
	opts := &slog.HandlerOptions{Level: parsed}
	var handler slog.Handler
	if ginMode == "release" {
		handler = slog.NewJSONHandler(w, opts)
	} else {
		handler = slog.NewTextHandler(w, opts)
	}
	return slog.New(ContextHandler{handler})
}

func Setup(ginMode, level string) {
	slog.SetDefault(New(os.Stdout, ginMode, level))
	if _, ok := ParseLevel(level); !ok {
		slog.Warn("invalid LOG_LEVEL, defaulting to info", "value", level)
	}
}
