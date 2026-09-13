package websocket

import (
	"encoding/json"
	"log"
	"sync"
	"sync/atomic"
	"time"

	"radius/internal/models"
)

type Hub struct {
	stateMu      sync.RWMutex
	clients      map[*Client]bool
	storeClients map[int]map[*Client]bool
	adminClients map[*Client]bool

	register   chan *Client
	unregister chan *Client
	broadcast  chan models.WebSocketEvent

	mu       sync.Mutex
	isClosed bool
	quit     chan struct{}
	done     chan struct{}

	clientCount atomic.Int64
}

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

			h.stateMu.RLock()
			targets := make([]*Client, 0, len(h.clients))
			targetSet := make(map[*Client]struct{})

			if event.StoreId > 0 {
				if storeMap, ok := h.storeClients[event.StoreId]; ok {
					for c := range storeMap {
						targetSet[c] = struct{}{}
					}
				}
				for c := range h.adminClients {
					targetSet[c] = struct{}{}
				}
			} else {
				for c := range h.clients {
					targetSet[c] = struct{}{}
				}
			}

			for c := range targetSet {
				targets = append(targets, c)
			}
			h.stateMu.RUnlock()

			var slowClients []*Client
			for _, c := range targets {
				select {
				case c.Send <- data:
				default:
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

func (h *Hub) Register(c *Client) {
	h.mu.Lock()
	closed := h.isClosed
	h.mu.Unlock()
	if !closed && c != nil {
		h.register <- c
	}
}

func (h *Hub) RegisterClient(c *Client) {
	h.Register(c)
}

func (h *Hub) Unregister(c *Client) {
	h.mu.Lock()
	closed := h.isClosed
	h.mu.Unlock()
	if !closed && c != nil {
		h.unregister <- c
	}
}

func (h *Hub) UnregisterClient(c *Client) {
	h.Unregister(c)
}

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

func (h *Hub) BroadcastToStore(storeID int, event models.WebSocketEvent) {
	event.StoreId = storeID
	h.Broadcast(event)
}

func (h *Hub) BroadcastEvent(event *models.WebSocketEvent) {
	if event != nil {
		h.Broadcast(*event)
	}
}

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

func (h *Hub) ClientCount() int {
	return int(h.clientCount.Load())
}

func (h *Hub) TotalConnectedClients() int {
	return h.ClientCount()
}

func (h *Hub) StoreClientCount(storeID int) int {
	h.stateMu.RLock()
	defer h.stateMu.RUnlock()
	return len(h.storeClients[storeID])
}

func (h *Hub) AdminClientCount() int {
	h.stateMu.RLock()
	defer h.stateMu.RUnlock()
	return len(h.adminClients)
}
