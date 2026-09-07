// radius-backend/internal/websocket/client.go
package websocket

import (
	"bytes"
	"encoding/json"
	"log"
	"sync"
	"sync/atomic"
	"time"

	"radius/internal/models"

	"github.com/gorilla/websocket"
)

const (
	// writeWait is the time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// pongWait is the time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// pingPeriod is the send ping period. Must be less than pongWait.
	// 54 seconds prevents NAT/mobile gateway timeouts.
	pingPeriod = (pongWait * 9) / 10

	// maxMessageSize is the maximum message size allowed from peer (512 KB).
	maxMessageSize = 512 * 1024

	// sendBufferSize is the capacity of the outbound message channel.
	sendBufferSize = 256
)

var (
	newline = []byte{'\n'}
	space   = []byte{' '}
)

// Client represents a connected WebSocket client session.
type Client struct {
	Hub        *Hub
	Conn       *websocket.Conn
	Send       chan []byte
	StoreId    int
	EmployeeId int
	Role       models.EmployeeRole
	Email      string
	isClosed   atomic.Bool
	closeOnce  sync.Once
}

// NewClient creates a new production Client instance with standard buffer size.
func NewClient(hub *Hub, conn *websocket.Conn, storeID, employeeID int, role models.EmployeeRole, email ...string) *Client {
	var userEmail string
	if len(email) > 0 {
		userEmail = email[0]
	}
	return &Client{
		Hub:        hub,
		Conn:       conn,
		Send:       make(chan []byte, sendBufferSize),
		StoreId:    storeID,
		EmployeeId: employeeID,
		Role:       role,
		Email:      userEmail,
	}
}

// NewTestClient creates a Client suitable for in-memory unit testing without an active network socket.
func NewTestClient(hub *Hub, storeID, employeeID int, role models.EmployeeRole, bufSize int) *Client {
	if bufSize <= 0 {
		bufSize = sendBufferSize
	}
	return &Client{
		Hub:        hub,
		Conn:       nil,
		Send:       make(chan []byte, bufSize),
		StoreId:    storeID,
		EmployeeId: employeeID,
		Role:       role,
	}
}

// StoreID returns the client's store ID.
func (c *Client) StoreID() int {
	return c.StoreId
}

// EmployeeID returns the client's employee ID.
func (c *Client) EmployeeID() int {
	return c.EmployeeId
}

// IsClosed returns whether the client has been marked as closed.
func (c *Client) IsClosed() bool {
	return c.isClosed.Load()
}

// TrySend attempts a non-blocking send to the client's Send channel.
// Returns true if sent, false if channel is full or client is closed.
func (c *Client) TrySend(data []byte) bool {
	if c.isClosed.Load() {
		return false
	}
	select {
	case c.Send <- data:
		return true
	default:
		return false
	}
}

// SafeCloseSend safely closes the Send channel and marks the client closed exactly once.
func (c *Client) SafeCloseSend() {
	c.closeOnce.Do(func() {
		c.isClosed.Store(true)
		close(c.Send)
		if c.Conn != nil {
			_ = c.Conn.Close()
		}
	})
}

// Close closes the underlying network connection.
func (c *Client) Close() {
	if c.Conn != nil {
		_ = c.Conn.Close()
	}
}

// ReadPump pumps messages from the websocket connection to the hub.
// The application runs ReadPump in a per-connection goroutine.
func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister(c)
		c.Close()
	}()

	if c.Conn == nil {
		return
	}

	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		messageType, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err,
				websocket.CloseGoingAway,
				websocket.CloseAbnormalClosure,
				websocket.CloseNormalClosure) {
				log.Printf("[WS CLIENT] Read error for employee=%d: %v", c.EmployeeId, err)
			}
			break
		}

		// Handle client-initiated heartbeats or ping messages over JSON text frames
		if messageType == websocket.TextMessage {
			message = bytes.TrimSpace(bytes.Replace(message, newline, space, -1))
			var event models.WebSocketEvent
			if err := json.Unmarshal(message, &event); err == nil {
				if event.Type == models.EventPing {
					pongEvent := models.WebSocketEvent{
						Type:      models.EventPong,
						StoreId:   c.StoreId,
						Timestamp: time.Now().UTC(),
					}
					if pongBytes, err := json.Marshal(pongEvent); err == nil {
						c.TrySend(pongBytes)
					}
				}
			}
		}
	}
}

// WritePump pumps messages from the send channel to the websocket connection.
// A goroutine running WritePump is started for each connection.
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			if c.Conn == nil {
				if !ok {
					return
				}
				continue
			}

			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel: send close frame and exit.
				_ = c.Conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, "connection closed"))
				return
			}

			if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Printf("[WS CLIENT] Write error for employee=%d: %v", c.EmployeeId, err)
				return
			}

		case <-ticker.C:
			if c.Conn == nil {
				continue
			}
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Printf("[WS CLIENT] Ping failed for employee=%d: %v", c.EmployeeId, err)
				return
			}
		}
	}
}
