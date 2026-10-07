FROM golang:1.26.6-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git ca-certificates tzdata

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/bin/api ./cmd/api && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/bin/migrate ./cmd/migrate

FROM alpine:3.21

RUN apk add --no-cache ca-certificates tzdata

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=builder /app/bin/ /app/bin/

COPY --from=builder /app/migrations /app/migrations

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

CMD ["/app/bin/api"]
