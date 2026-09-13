package websocket_test

import (
	"encoding/json"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"radius/internal/models"
	"radius/internal/websocket"
)

func newTestClient(hub *websocket.Hub, storeID, employeeID int, role models.EmployeeRole, bufSize int) *websocket.Client {
	return websocket.NewTestClient(hub, storeID, employeeID, role, bufSize)
}

func TestHub_ConcurrentRegisterUnregister(t *testing.T) {
	hub := websocket.NewHub()
	go hub.Run()
	defer hub.Stop()

	const numGoroutines = 50
	const clientsPerGoroutine = 10
	var wg sync.WaitGroup
	var registeredClients sync.Map

	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(gID int) {
			defer wg.Done()
			for j := 0; j < clientsPerGoroutine; j++ {
				storeID := (gID % 5) + 2
				empID := gID*100 + j
				client := newTestClient(hub, storeID, empID, models.RoleSales, 64)
				hub.Register(client)
				registeredClients.Store(fmt.Sprintf("%d-%d", gID, j), client)
			}
		}(i)
	}

	stopBroadcast := make(chan struct{})
	go func() {
		counter := 0
		for {
			select {
			case <-stopBroadcast:
				return
			case <-time.After(3 * time.Millisecond):
				counter++
				hub.Broadcast(models.WebSocketEvent{
					Type:      models.EventOrderCreated,
					StoreId:   (counter % 5) + 2,
					Timestamp: time.Now().UTC(),
					Payload:   map[string]any{"seq": counter},
				})
			}
		}
	}()

	wg.Wait()
	close(stopBroadcast)

	expectedTotal := numGoroutines * clientsPerGoroutine
	deadline := time.Now().Add(2 * time.Second)
	for hub.ClientCount() < expectedTotal && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}

	if count := hub.ClientCount(); count != expectedTotal {
		t.Fatalf("expected %d registered clients, got %d", expectedTotal, count)
	}

	var unregWg sync.WaitGroup
	var unregCount int64

	registeredClients.Range(func(key, val any) bool {
		if atomic.AddInt64(&unregCount, 1)%2 == 0 {
			unregWg.Add(1)
			go func(c *websocket.Client) {
				defer unregWg.Done()
				hub.Unregister(c)
			}(val.(*websocket.Client))
		}
		return true
	})

	unregWg.Wait()

	expectedRemaining := expectedTotal - int(unregCount/2)
	deadline = time.Now().Add(2 * time.Second)
	for hub.ClientCount() > expectedRemaining && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}

	if count := hub.ClientCount(); count != expectedRemaining {
		t.Fatalf("expected %d remaining clients after unregister, got %d", expectedRemaining, count)
	}
}

func TestHub_StoreIsolation(t *testing.T) {
	hub := websocket.NewHub()
	go hub.Run()
	defer hub.Stop()

	clientStore2 := newTestClient(hub, 2, 101, models.RoleSales, 10)
	hub.Register(clientStore2)

	clientStore3 := newTestClient(hub, 3, 102, models.RoleSales, 10)
	hub.Register(clientStore3)

	clientAdmin := newTestClient(hub, 1, 100, models.RoleAdmin, 10)
	hub.Register(clientAdmin)

	time.Sleep(50 * time.Millisecond)

	orderEvent := models.WebSocketEvent{
		Type:      models.EventOrderCreated,
		StoreId:   2,
		Timestamp: time.Now().UTC(),
		Payload: map[string]any{
			"order_id":    1001,
			"store_id":    2,
			"customer":    "Alice Store2",
			"total_price": 99.50,
		},
	}
	hub.Broadcast(orderEvent)

	select {
	case rawMsg := <-clientStore2.Send:
		var received models.WebSocketEvent
		if err := json.Unmarshal(rawMsg, &received); err != nil {
			t.Fatalf("failed to unmarshal Store 2 event: %v", err)
		}
		if received.StoreId != 2 {
			t.Errorf("clientStore2: expected store_id 2, got %d", received.StoreId)
		}
		if received.Type != models.EventOrderCreated {
			t.Errorf("clientStore2: expected type %s, got %s", models.EventOrderCreated, received.Type)
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatal("clientStore2 timed out waiting for Store 2 event")
	}

	select {
	case rawMsg := <-clientAdmin.Send:
		var received models.WebSocketEvent
		if err := json.Unmarshal(rawMsg, &received); err != nil {
			t.Fatalf("failed to unmarshal admin event: %v", err)
		}
		if received.StoreId != 2 {
			t.Errorf("clientAdmin: expected store_id 2, got %d", received.StoreId)
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatal("clientAdmin timed out waiting for Store 2 event")
	}

	select {
	case unexpected := <-clientStore3.Send:
		t.Fatalf("clientStore3 unexpectedly received event: %s (store isolation violated!)", string(unexpected))
	case <-time.After(100 * time.Millisecond):
	}

	cycleEvent := models.WebSocketEvent{
		Type:      models.EventCycleCountUpdated,
		StoreId:   3,
		Timestamp: time.Now().UTC(),
		Payload: map[string]any{
			"count_id": 501,
			"store_id": 3,
			"status":   "IN PROGRESS",
		},
	}
	hub.Broadcast(cycleEvent)

	select {
	case rawMsg := <-clientStore3.Send:
		var received models.WebSocketEvent
		if err := json.Unmarshal(rawMsg, &received); err != nil {
			t.Fatalf("failed to unmarshal Store 3 event: %v", err)
		}
		if received.StoreId != 3 {
			t.Errorf("clientStore3: expected store_id 3, got %d", received.StoreId)
		}
		if received.Type != models.EventCycleCountUpdated {
			t.Errorf("clientStore3: expected type %s, got %s", models.EventCycleCountUpdated, received.Type)
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatal("clientStore3 timed out waiting for Store 3 event")
	}

	select {
	case rawMsg := <-clientAdmin.Send:
		var received models.WebSocketEvent
		if err := json.Unmarshal(rawMsg, &received); err != nil {
			t.Fatalf("failed to unmarshal admin event: %v", err)
		}
		if received.StoreId != 3 {
			t.Errorf("clientAdmin: expected store_id 3, got %d", received.StoreId)
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatal("clientAdmin timed out waiting for Store 3 event")
	}

	select {
	case unexpected := <-clientStore2.Send:
		t.Fatalf("clientStore2 unexpectedly received event: %s (store isolation violated!)", string(unexpected))
	case <-time.After(100 * time.Millisecond):
	}
}

func TestHub_DisconnectHandling(t *testing.T) {
	hub := websocket.NewHub()
	go hub.Run()
	defer hub.Stop()

	client := newTestClient(hub, 2, 201, models.RoleSales, 10)
	hub.Register(client)
	time.Sleep(30 * time.Millisecond)

	hub.Broadcast(models.WebSocketEvent{
		Type:      models.EventOrderCreated,
		StoreId:   2,
		Timestamp: time.Now().UTC(),
	})

	hub.Unregister(client)
	time.Sleep(50 * time.Millisecond)

	rawMsg, ok := <-client.Send
	if !ok {
		t.Fatal("expected to read queued message before channel closure")
	}
	var received models.WebSocketEvent
	if err := json.Unmarshal(rawMsg, &received); err != nil {
		t.Fatalf("failed to unmarshal queued message: %v", err)
	}
	if received.Type != models.EventOrderCreated {
		t.Errorf("expected %s, got %s", models.EventOrderCreated, received.Type)
	}

	_, ok = <-client.Send
	if ok {
		t.Fatal("expected client.Send channel to be closed after unregister")
	}

	defer func() {
		if r := recover(); r != nil {
			t.Fatalf("hub.Unregister panicked on duplicate unregister: %v", r)
		}
	}()
	hub.Unregister(client)
	hub.Unregister(client)
	client.SafeCloseSend()
	client.SafeCloseSend()

	if count := hub.ClientCount(); count != 0 {
		t.Fatalf("expected 0 clients in hub, got %d", count)
	}
}

func TestHub_SlowClientEviction(t *testing.T) {
	hub := websocket.NewHub()
	go hub.Run()
	defer hub.Stop()

	normalClient := newTestClient(hub, 2, 301, models.RoleSales, 100)
	hub.Register(normalClient)

	slowClient := newTestClient(hub, 2, 302, models.RoleSales, 1)
	hub.Register(slowClient)
	time.Sleep(50 * time.Millisecond)

	for i := 0; i < 10; i++ {
		hub.Broadcast(models.WebSocketEvent{
			Type:      models.EventStoreActivity,
			StoreId:   2,
			Timestamp: time.Now().UTC(),
			Payload:   map[string]any{"index": i},
		})
	}

	time.Sleep(100 * time.Millisecond)

	receivedCount := 0
	for len(normalClient.Send) > 0 {
		<-normalClient.Send
		receivedCount++
	}
	if receivedCount < 10 {
		t.Fatalf("normal client expected 10 messages, got %d", receivedCount)
	}

	deadline := time.Now().Add(time.Second)
	for hub.StoreClientCount(2) > 1 && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}

	if hub.StoreClientCount(2) != 1 {
		t.Fatalf("expected slow client to be evicted, store client count: %d", hub.StoreClientCount(2))
	}
}

func TestHub_GlobalBroadcast(t *testing.T) {
	hub := websocket.NewHub()
	go hub.Run()
	defer hub.Stop()

	clientStore2 := newTestClient(hub, 2, 401, models.RoleSales, 10)
	clientStore3 := newTestClient(hub, 3, 402, models.RoleSales, 10)
	hub.Register(clientStore2)
	hub.Register(clientStore3)

	time.Sleep(50 * time.Millisecond)

	globalEvent := models.WebSocketEvent{
		Type:      models.EventStoreActivity,
		StoreId:   0,
		Timestamp: time.Now().UTC(),
		Payload:   map[string]any{"announcement": "System wide alert"},
	}
	hub.Broadcast(globalEvent)

	for _, c := range []*websocket.Client{clientStore2, clientStore3} {
		select {
		case rawMsg := <-c.Send:
			var received models.WebSocketEvent
			if err := json.Unmarshal(rawMsg, &received); err != nil {
				t.Fatalf("failed to unmarshal global event: %v", err)
			}
			if received.Type != models.EventStoreActivity {
				t.Errorf("expected %s, got %s", models.EventStoreActivity, received.Type)
			}
		case <-time.After(500 * time.Millisecond):
			t.Fatalf("client for store %d timed out waiting for global event", c.StoreId)
		}
	}
}

func TestHub_Shutdown(t *testing.T) {
	hub := websocket.NewHub()
	go hub.Run()

	clients := make([]*websocket.Client, 10)
	for i := 0; i < 10; i++ {
		clients[i] = newTestClient(hub, 2, 500+i, models.RoleSales, 10)
		hub.Register(clients[i])
	}
	time.Sleep(50 * time.Millisecond)

	if hub.ClientCount() != 10 {
		t.Fatalf("expected 10 registered clients, got %d", hub.ClientCount())
	}

	hub.Stop()

	for i, c := range clients {
		_, ok := <-c.Send
		if ok {
			t.Errorf("client %d Send channel should be closed after hub.Stop()", i)
		}
	}

	if hub.ClientCount() != 0 {
		t.Fatalf("expected 0 clients after hub.Stop(), got %d", hub.ClientCount())
	}
}
