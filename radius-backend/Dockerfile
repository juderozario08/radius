# ==============================================================================
# Multi-stage Dockerfile for Radius Backend
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build the Go binaries
# ------------------------------------------------------------------------------
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Cache Go modules layer
COPY go.mod go.sum ./
RUN go mod download

# Copy application source code
COPY . .

# Build statically linked binaries for API server, migration runner, and seed runner
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/bin/api ./cmd/api && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/bin/migrate ./cmd/migrate && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/bin/seeds ./cmd/seeds

# ------------------------------------------------------------------------------
# Stage 2: Minimal runtime image
# ------------------------------------------------------------------------------
FROM alpine:3.21

# Install runtime dependencies (SSL certificates and timezone database)
RUN apk add --no-cache ca-certificates tzdata

# Create dedicated non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy compiled binaries from builder stage
COPY --from=builder /app/bin/ /app/bin/

# Copy migrations and seed directories required for runtime execution
COPY --from=builder /app/migrations /app/migrations
COPY --from=builder /app/seeds /app/seeds

# Set file permissions for non-root user
RUN chown -R appuser:appgroup /app

USER appuser

# Expose backend API port
EXPOSE 8080

# Run API server by default
CMD ["/app/bin/api"]
