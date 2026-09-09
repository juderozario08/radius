// radius-backend/internal/websocket/hub.go
package websocket

import (
	"encoding/json"
	"log"
	"sync"
	"sync/atomic"
	"time"

	"radius/internal/models"
)

// Hub coordinates real-time client registrations, unregistrations, and store-isolated broadcasts.
type Hub struct {
	// Registered clients registries protected by stateMu for race-free inspection
	stateMu      sync.RWMutex
	clients      map[*Client]bool
	storeClients map[int]map[*Client]bool
	adminClients map[*Client]bool

	// Inbound event channels
	register   chan *Client
	unregister chan *Client
	broadcast  chan models.WebSocketEvent

	// Concurrency & safe shutdown
	mu       sync.Mutex
	isClosed bool
	quit     chan struct{}
	done     chan struct{}

	// Metrics
	clientCount atomic.Int64
}

// NewHub instantiates a new WebSocket Hub.
func NewHub() *Hub {
	return &Hub{
		clients:      make(map[*Client]bool),
		storeClients: make(map[int]map[*Client]bool),
		adminClients: make(map[*Client]bool),
		register:     make(chan *Client, 256),
		unregister:   make(chan *Client, 256),
		broadcast:    make(chan models.WebSocketEvent, 1024),
		quit:         make(chan struct{}),
		done:         make(chan struct{}),
	}
}

// Run executes the central multiplexing event loop.
func (h *Hub) Run() {
	defer close(h.done)

	for {
		select {
		case client := <-h.register:
			if client == nil {
				continue
			}
			h.stateMu.Lock()
			h.clients[client] = true

			if _, ok := h.storeClients[client.StoreId]; !ok {
				h.storeClients[client.StoreId] = make(map[*Client]bool)
			}
			h.storeClients[client.StoreId][client] = true

			if client.Role == models.RoleAdmin {
				h.adminClients[client] = true
			}
			h.clientCount.Add(1)
			h.stateMu.Unlock()

		case client := <-h.unregister:
			if client != nil {
				h.stateMu.Lock()
				h.removeClient(client)
				h.stateMu.Unlock()
			}

		case event := <-h.broadcast:
			data, err := json.Marshal(event)
			if err != nil {
				log.Printf("[WS HUB] Failed to serialize event %s: %v", event.Type, err)
				continue
			}

			// Assemble target client set under read lock
			h.stateMu.RLock()
			targets := make([]*Client, 0, len(h.clients))
			targetSet := make(map[*Client]struct{})

			if event.StoreId > 0 {
				// Store-specific event: send to matching store clients
				if storeMap, ok := h.storeClients[event.StoreId]; ok {
					for c := range storeMap {
						targetSet[c] = struct{}{}
					}
				}
				// Also send to all connected admins
				for c := range h.adminClients {
					targetSet[c] = struct{}{}
				}
			} else {
				// Global event (StoreId == 0): send to all connected clients
				for c := range h.clients {
					targetSet[c] = struct{}{}
				}
			}

			for c := range targetSet {
				targets = append(targets, c)
			}
			h.stateMu.RUnlock()

			// Fan out with non-blocking send and slow client detection
			var slowClients []*Client
			for _, c := range targets {
				select {
				case c.Send <- data:
				default:
					// Send buffer overflow: slow client detected
					log.Printf("[WS HUB] Slow client evicted: employee=%d, store=%d", c.EmployeeId, c.StoreId)
					slowClients = append(slowClients, c)
				}
			}

			if len(slowClients) > 0 {
				h.stateMu.Lock()
				for _, c := range slowClients {
					h.removeClient(c)
				}
				h.stateMu.Unlock()
			}

		case <-h.quit:
			h.stateMu.Lock()
			for c := range h.clients {
				c.SafeCloseSend()
			}
			h.clients = make(map[*Client]bool)
			h.storeClients = make(map[int]map[*Client]bool)
			h.adminClients = make(map[*Client]bool)
			h.clientCount.Store(0)
			h.stateMu.Unlock()
			return
		}
	}
}

// removeClient removes a client from all internal registries and closes its send channel.
// Must be called with stateMu.Lock held.
func (h *Hub) removeClient(c *Client) {
	if _, ok := h.clients[c]; ok {
		delete(h.clients, c)
		if storeMap, ok := h.storeClients[c.StoreId]; ok {
			delete(storeMap, c)
			if len(storeMap) == 0 {
				delete(h.storeClients, c.StoreId)
			}
		}
		delete(h.adminClients, c)
		c.SafeCloseSend()
		h.clientCount.Add(-1)
	}
}

// Register queues a client for registration with the hub.
func (h *Hub) Register(c *Client) {
	h.mu.Lock()
	closed := h.isClosed
	h.mu.Unlock()
	if !closed && c != nil {
		h.register <- c
	}
}

// RegisterClient is an alias for Register.
func (h *Hub) RegisterClient(c *Client) {
	h.Register(c)
}

// Unregister queues a client for unregistration and resource cleanup.
func (h *Hub) Unregister(c *Client) {
	h.mu.Lock()
	closed := h.isClosed
	h.mu.Unlock()
	if !closed && c != nil {
		h.unregister <- c
	}
}

// UnregisterClient is an alias for Unregister.
func (h *Hub) UnregisterClient(c *Client) {
	h.Unregister(c)
}

// Broadcast queues an event to be broadcast to all connected clients or admins.
func (h *Hub) Broadcast(event models.WebSocketEvent) {
	h.mu.Lock()
	closed := h.isClosed
	h.mu.Unlock()
	if closed {
		return
	}
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now().UTC()
	}
	select {
	case h.broadcast <- event:
	default:
		log.Printf("[WS HUB] Warning: broadcast queue full, dropping event %s", event.Type)
	}
}

// BroadcastToStore queues an event scoped to a specific store (and supervising admins).
func (h *Hub) BroadcastToStore(storeID int, event models.WebSocketEvent) {
	event.StoreId = storeID
	h.Broadcast(event)
}

// BroadcastEvent is a pointer convenience method for Broadcast.
func (h *Hub) BroadcastEvent(event *models.WebSocketEvent) {
	if event != nil {
		h.Broadcast(*event)
	}
}

// Stop initiates a graceful shutdown of the hub and waits for completion.
func (h *Hub) Stop() {
	h.mu.Lock()
	if h.isClosed {
		h.mu.Unlock()
		return
	}
	h.isClosed = true
	close(h.quit)
	h.mu.Unlock()
	<-h.done
}

// ClientCount returns the total number of connected clients.
func (h *Hub) ClientCount() int {
	return int(h.clientCount.Load())
}

// TotalConnectedClients is an alias for ClientCount.
func (h *Hub) TotalConnectedClients() int {
	return h.ClientCount()
}

// StoreClientCount returns the number of clients currently registered for a specific store.
func (h *Hub) StoreClientCount(storeID int) int {
	h.stateMu.RLock()
	defer h.stateMu.RUnlock()
	return len(h.storeClients[storeID])
}

// AdminClientCount returns the number of active admin clients.
func (h *Hub) AdminClientCount() int {
	h.stateMu.RLock()
	defer h.stateMu.RUnlock()
	return len(h.adminClients)
}
