package websocket_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	gorilla "github.com/gorilla/websocket"

	"radius/internal/handler"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/utils"
	"radius/internal/websocket"
)

func setupTestWSServer(jwtSecret []byte) (*httptest.Server, *websocket.Hub) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(gin.Recovery())

	hub := websocket.NewHub()
	go hub.Run()

	wsHandler := handler.NewWSHandler(hub, jwtSecret, nil)

	router.GET("/api/v1/ws", wsHandler.HandleWS)
	router.GET("/ws", wsHandler.HandleWS)

	server := httptest.NewServer(router)
	return server, hub
}

func TestWSHandshake_MissingToken(t *testing.T) {
	jwtSecret := []byte("test_secret_key_1234567890123456")
	server, hub := setupTestWSServer(jwtSecret)
	defer server.Close()
	defer hub.Stop()

	testPaths := []string{"/api/v1/ws", "/ws"}

	for _, path := range testPaths {
		wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + path

		conn, resp, err := gorilla.DefaultDialer.Dial(wsURL, nil)
		if conn != nil {
			conn.Close()
			t.Fatalf("expected dial to %s to fail, but connection was established", path)
		}

		if resp == nil {
			t.Fatalf("expected HTTP response from %s, got nil (err: %v)", path, err)
		}

		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("path %s: expected status %d Unauthorized, got %d", path, http.StatusUnauthorized, resp.StatusCode)
		}
	}
}

func TestWSHandshake_InvalidToken(t *testing.T) {
	jwtSecret := []byte("test_secret_key_1234567890123456")
	server, hub := setupTestWSServer(jwtSecret)
	defer server.Close()
	defer hub.Stop()

	refreshToken, err := utils.GenerateRefreshToken(10, "test@example.com", models.RoleSales, jwtSecret)
	if err != nil {
		t.Fatalf("failed to generate refresh token: %v", err)
	}

	wrongSecret := []byte("completely_different_signing_key")
	wrongSecretToken, err := utils.GenerateAccessToken(10, "test@example.com", models.RoleSales, wrongSecret)
	if err != nil {
		t.Fatalf("failed to generate wrong secret token: %v", err)
	}

	testCases := []struct {
		name       string
		tokenParam string
	}{
		{"Garbage String", "not_a_valid_jwt_token_at_all"},
		{"Malformed Header", "eyJhbGciOiJIUzI1NiJ9.eyJmb28iOiJiYXIifQ.signature"},
		{"Wrong Secret Key", wrongSecretToken},
		{"Refresh Token Type", refreshToken},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/api/v1/ws?token=" + tc.tokenParam

			conn, resp, err := gorilla.DefaultDialer.Dial(wsURL, nil)
			if conn != nil {
				conn.Close()
				t.Fatal("expected connection to fail, but got active websocket connection")
			}

			if resp == nil {
				t.Fatalf("expected HTTP response, got nil (err: %v)", err)
			}

			if resp.StatusCode != http.StatusUnauthorized {
				t.Fatalf("expected status %d Unauthorized, got %d", http.StatusUnauthorized, resp.StatusCode)
			}
		})
	}
}

func TestWSHandshake_ValidJWT_Success(t *testing.T) {
	jwtSecret := []byte("test_secret_key_1234567890123456")
	server, hub := setupTestWSServer(jwtSecret)
	defer server.Close()
	defer hub.Stop()

	validToken, err := utils.GenerateAccessToken(42, "employee@store2.com", models.RoleSales, jwtSecret)
	if err != nil {
		t.Fatalf("failed to generate access token: %v", err)
	}

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/api/v1/ws?token=" + validToken + "&store_id=2"

	conn, resp, err := gorilla.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("websocket dial failed: %v", err)
	}
	defer conn.Close()

	if resp.StatusCode != http.StatusSwitchingProtocols {
		t.Fatalf("expected status %d Switching Protocols, got %d", http.StatusSwitchingProtocols, resp.StatusCode)
	}

	deadline := time.Now().Add(time.Second)
	for hub.StoreClientCount(2) != 1 && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	if hub.StoreClientCount(2) != 1 {
		t.Fatalf("expected 1 registered client for store 2, got %d", hub.StoreClientCount(2))
	}

	testOrder := models.WebSocketEvent{
		Type:      models.EventOrderCreated,
		StoreId:   2,
		Timestamp: time.Now().UTC(),
		Payload: map[string]any{
			"order_id":      2001,
			"customer_name": "John Doe",
			"status":        "READY FOR PICKUP",
			"total_amount":  149.99,
		},
	}
	hub.Broadcast(testOrder)

	conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	var received models.WebSocketEvent
	err = conn.ReadJSON(&received)
	if err != nil {
		t.Fatalf("failed to read JSON event from websocket: %v", err)
	}

	if received.Type != models.EventOrderCreated {
		t.Errorf("expected type %s, got %s", models.EventOrderCreated, received.Type)
	}
	if received.StoreId != 2 {
		t.Errorf("expected store_id 2, got %d", received.StoreId)
	}

	err = conn.WriteControl(gorilla.PingMessage, []byte("heartbeat"), time.Now().Add(time.Second))
	if err != nil {
		t.Fatalf("failed to write ping control frame: %v", err)
	}
}

func TestWSHandshake_ValidJWT_AuthorizationHeader(t *testing.T) {
	jwtSecret := []byte("test_secret_key_1234567890123456")
	server, hub := setupTestWSServer(jwtSecret)
	defer server.Close()
	defer hub.Stop()

	validToken, err := utils.GenerateAccessToken(43, "manager@store2.com", models.RoleManager, jwtSecret)
	if err != nil {
		t.Fatalf("failed to generate access token: %v", err)
	}

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/api/v1/ws?store_id=2"

	header := http.Header{}
	header.Set("Authorization", "Bearer "+validToken)

	conn, resp, err := gorilla.DefaultDialer.Dial(wsURL, header)
	if err != nil {
		t.Fatalf("dial with Authorization header failed: %v", err)
	}
	defer conn.Close()

	if resp.StatusCode != http.StatusSwitchingProtocols {
		t.Fatalf("expected status 101, got %d", resp.StatusCode)
	}

	deadline := time.Now().Add(time.Second)
	for hub.StoreClientCount(2) != 1 && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	if hub.StoreClientCount(2) != 1 {
		t.Fatalf("expected 1 registered client for store 2, got %d", hub.StoreClientCount(2))
	}
}

func TestWSHandshake_StoreIsolation_LiveSockets(t *testing.T) {
	jwtSecret := []byte("test_secret_key_1234567890123456")
	server, hub := setupTestWSServer(jwtSecret)
	defer server.Close()
	defer hub.Stop()

	token2, _ := utils.GenerateAccessToken(51, "store2@test.com", models.RoleSales, jwtSecret)
	wsURL2 := "ws" + strings.TrimPrefix(server.URL, "http") + "/api/v1/ws?token=" + token2 + "&store_id=2"
	conn2, _, err := gorilla.DefaultDialer.Dial(wsURL2, nil)
	if err != nil {
		t.Fatalf("failed to dial store 2 socket: %v", err)
	}
	defer conn2.Close()

	token3, _ := utils.GenerateAccessToken(52, "store3@test.com", models.RoleSales, jwtSecret)
	wsURL3 := "ws" + strings.TrimPrefix(server.URL, "http") + "/api/v1/ws?token=" + token3 + "&store_id=3"
	conn3, _, err := gorilla.DefaultDialer.Dial(wsURL3, nil)
	if err != nil {
		t.Fatalf("failed to dial store 3 socket: %v", err)
	}
	defer conn3.Close()

	time.Sleep(50 * time.Millisecond)

	hub.Broadcast(models.WebSocketEvent{
		Type:      models.EventOrderCreated,
		StoreId:   2,
		Timestamp: time.Now().UTC(),
		Payload:   map[string]any{"order_id": 999},
	})

	conn2.SetReadDeadline(time.Now().Add(time.Second))
	var received models.WebSocketEvent
	if err := conn2.ReadJSON(&received); err != nil {
		t.Fatalf("conn2 failed to read event: %v", err)
	}
	if received.StoreId != 2 {
		t.Errorf("expected store_id 2, got %d", received.StoreId)
	}

	conn3.SetReadDeadline(time.Now().Add(150 * time.Millisecond))
	var unexpected models.WebSocketEvent
	err = conn3.ReadJSON(&unexpected)
	if err == nil {
		t.Fatalf("conn3 unexpectedly received event: %+v (isolation failure)", unexpected)
	}
}

type testOrdersRepo struct {
	nextID int
}

func (r *testOrdersRepo) GetAllOnlineOrders(ctx context.Context, limit, offset int, storeID *int, criteria models.OrderSearchCriteria) ([]models.OnlineOrder, int, error) {
	return nil, 0, nil
}

func (r *testOrdersRepo) GetOnlineOrderByID(ctx context.Context, id int, storeID *int) (*models.OnlineOrder, []models.OnlineOrderItem, error) {
	return nil, nil, nil
}

func (r *testOrdersRepo) CreateOnlineOrder(ctx context.Context, order *models.OnlineOrder) (*models.OnlineOrder, error) {
	if r.nextID == 0 {
		r.nextID = 5000
	}
	r.nextID++
	order.OrderId = r.nextID
	if order.PlacedAt.IsZero() {
		order.PlacedAt = time.Now().UTC()
	}
	for i := range order.Items {
		order.Items[i].OrderItemId = 6000 + i
		order.Items[i].OrderId = order.OrderId
	}
	return order, nil
}

func (r *testOrdersRepo) AssignOnlineOrder(ctx context.Context, orderID int, employeeID *int, storeID *int, force bool) (*models.OnlineOrder, bool, error) {
	return nil, true, nil
}

func (r *testOrdersRepo) UpdateOnlineOrderItem(ctx context.Context, orderID, itemID int, pickedQty *int, status string, reason *string) error {
	return nil
}

func (r *testOrdersRepo) UpdateOnlineOrderStatus(ctx context.Context, orderID int, status models.OnlineOrderStatus, cancellationReason *string) (*models.OnlineOrder, error) {
	return &models.OnlineOrder{OrderId: orderID, Status: status}, nil
}

func (r *testOrdersRepo) AutoCancelExpiredBOPISOrders(ctx context.Context, olderThan time.Duration) ([]models.OnlineOrder, error) {
	return nil, nil
}

func (r *testOrdersRepo) GetAllPrintOrders(ctx context.Context, limit, offset int, storeID *int, criteria models.PrintOrderSearchCriteria) ([]models.PrintOrder, int, error) {
	return nil, 0, nil
}

func (r *testOrdersRepo) GetPrintOrderByID(ctx context.Context, id int, storeID *int) (*models.PrintOrder, []models.PrintOrderItem, error) {
	return nil, nil, nil
}

type testCycleCountRepo struct {
	count *models.CycleCount
}

func (r *testCycleCountRepo) GetWeeklyCycleCounts(ctx context.Context, storeID int) ([]models.CycleCountSummary, error) {
	return nil, nil
}

func (r *testCycleCountRepo) GetCycleCountByID(ctx context.Context, countID int, storeID int) (*models.CycleCount, error) {
	if r.count != nil {
		return r.count, nil
	}
	return &models.CycleCount{
		CountId: countID,
		StoreId: storeID,
	}, nil
}

func (r *testCycleCountRepo) GetCycleCountItems(ctx context.Context, countID int) ([]models.CycleCountItemDetail, error) {
	return nil, nil
}

func (r *testCycleCountRepo) StartCycleCount(ctx context.Context, storeID int, categoryID int, employeeID int) (*models.CycleCount, error) {
	if r.count != nil {
		return r.count, nil
	}
	return &models.CycleCount{
		CountId:           301,
		StoreId:           storeID,
		CategoryId:        categoryID,
		CategoryName:      "Audio & Headphones",
		Status:            models.CycleCountStatusInProgress,
		TotalItems:        45,
		CountedItems:      12,
		TotalVarianceCost: -35.50,
	}, nil
}

func (r *testCycleCountRepo) AutoAssignCycleCount(ctx context.Context, countID int, storeID int, employeeID int) (*models.CycleCount, error) {
	return r.count, nil
}

func (r *testCycleCountRepo) RecordScan(ctx context.Context, storeID int, req models.RecordScanRequest, employeeID int) (*models.CycleCountItemDetail, error) {
	return nil, nil
}

func (r *testCycleCountRepo) SubmitForApproval(ctx context.Context, storeID int, countID int, notes *string) error {
	return nil
}

func (r *testCycleCountRepo) ApproveCycleCount(ctx context.Context, storeID int, countID int, approverID int) error {
	return nil
}

func (r *testCycleCountRepo) TransferOwnership(ctx context.Context, storeID int, countID int, newEmployeeID int) error {
	return nil
}

func (r *testCycleCountRepo) SearchCycleCounts(ctx context.Context, storeID int, criteria models.CycleCountSearchCriteria) ([]models.CycleCountSummary, error) {
	return nil, nil
}

func (r *testCycleCountRepo) GetSchedule(ctx context.Context, storeID int, fromDate time.Time, toDate time.Time) ([]models.CycleCountScheduleEntry, error) {
	return nil, nil
}

func (r *testCycleCountRepo) CreateScheduleEntry(ctx context.Context, storeID int, categoryID int, scheduledDate time.Time, createdBy int) (*models.CycleCountScheduleEntry, error) {
	return nil, nil
}

type testEmployeeRepo struct {
	emp *models.Employee
}

func (r *testEmployeeRepo) GetEmployeeByEmail(ctx context.Context, email string) (*models.Employee, error) {
	return r.emp, nil
}

func (r *testEmployeeRepo) GetEmployeeById(ctx context.Context, id int) (*models.Employee, error) {
	return r.emp, nil
}

func (r *testEmployeeRepo) GetEmployeeByEmailWithSession(ctx context.Context, email string) (*models.GetEmployeeByEmailWithSession, error) {
	return nil, nil
}

func (r *testEmployeeRepo) GetAllEmployees(ctx context.Context, limit, offset int, storeId *int) ([]models.Employee, int, error) {
	return nil, 0, nil
}

func (r *testEmployeeRepo) CreateEmployee(ctx context.Context, model models.CreateEmployeeRow) (*models.CreateEmployeeResponse, error) {
	return nil, nil
}

func (r *testEmployeeRepo) TerminateEmployeeById(ctx context.Context, id int) error {
	return nil
}

func (r *testEmployeeRepo) ActivateEmployeeById(ctx context.Context, id int) error {
	return nil
}

func (r *testEmployeeRepo) UpdateEmployee(ctx context.Context, body models.Employee) error {
	return nil
}

func TestWebSocket_OrderCreated_AC1(t *testing.T) {
	jwtSecret := []byte("test_secret_key_1234567890123456")

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(gin.Recovery())

	hub := websocket.NewHub()
	go hub.Run()
	defer hub.Stop()

	wsHandler := handler.NewWSHandler(hub, jwtSecret, nil)
	router.GET("/api/v1/ws", wsHandler.HandleWS)

	testRepo := &testOrdersRepo{nextID: 5000}
	orderService := service.NewOnlineOrderService(testRepo, nil, nil, nil, nil, nil, hub)
	orderHandler := handler.NewOnlineOrderHandler(orderService)

	api := router.Group("/api/sales_floor")
	api.Use(func(c *gin.Context) {
		c.Set("email", "staff@store2.com")
		c.Set("role", string(models.RoleSales))
		c.Next()
	})
	api.POST("/orders/online", orderHandler.CreateOnlineOrder)

	server := httptest.NewServer(router)
	defer server.Close()

	token2, err := utils.GenerateAccessToken(101, "sales2@store2.com", models.RoleSales, jwtSecret)
	if err != nil {
		t.Fatalf("failed to generate access token: %v", err)
	}
	wsURL2 := "ws" + strings.TrimPrefix(server.URL, "http") + "/api/v1/ws?token=" + token2 + "&store_id=2"
	conn2, resp2, err := gorilla.DefaultDialer.Dial(wsURL2, nil)
	if err != nil {
		t.Fatalf("failed to dial store 2 socket: %v", err)
	}
	defer conn2.Close()
	if resp2.StatusCode != http.StatusSwitchingProtocols {
		t.Fatalf("expected 101 Switching Protocols, got %d", resp2.StatusCode)
	}

	token3, _ := utils.GenerateAccessToken(102, "sales3@store3.com", models.RoleSales, jwtSecret)
	wsURL3 := "ws" + strings.TrimPrefix(server.URL, "http") + "/api/v1/ws?token=" + token3 + "&store_id=3"
	conn3, _, err := gorilla.DefaultDialer.Dial(wsURL3, nil)
	if err != nil {
		t.Fatalf("failed to dial store 3 socket: %v", err)
	}
	defer conn3.Close()

	deadline := time.Now().Add(time.Second)
	for (hub.StoreClientCount(2) != 1 || hub.StoreClientCount(3) != 1) && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	if hub.StoreClientCount(2) != 1 {
		t.Fatalf("expected 1 client in store 2, got %d", hub.StoreClientCount(2))
	}

	orderBody := `{
		"store_id": 2,
		"customer_name": "Jane Smith",
		"customer_email": "jane.smith@example.com",
		"order_type": "BOPIS",
		"status": "READY FOR PICKUP",
		"total_amount": 249.50,
		"items": [
			{"product_id": 10, "quantity": 2, "unit_price": 124.75}
		]
	}`

	postResp, err := http.Post(
		server.URL+"/api/sales_floor/orders/online",
		"application/json",
		strings.NewReader(orderBody),
	)
	if err != nil {
		t.Fatalf("POST /api/sales_floor/orders/online failed: %v", err)
	}
	defer postResp.Body.Close()
	if postResp.StatusCode != http.StatusCreated {
		t.Fatalf("expected HTTP 201 Created, got %d", postResp.StatusCode)
	}

	conn2.SetReadDeadline(time.Now().Add(2 * time.Second))
	var received models.WebSocketEvent
	if err := conn2.ReadJSON(&received); err != nil {
		t.Fatalf("failed to read JSON event from store 2 websocket: %v", err)
	}

	if received.Type != models.EventOrderCreated {
		t.Errorf("expected event type %s, got %s", models.EventOrderCreated, received.Type)
	}
	if received.StoreId != 2 {
		t.Errorf("expected store_id 2, got %d", received.StoreId)
	}

	payloadMap, ok := received.Payload.(map[string]any)
	if !ok {
		t.Fatalf("expected payload to be map[string]any, got %T", received.Payload)
	}

	if actualCustomer, ok := payloadMap["customer_name"].(string); !ok || actualCustomer != "Jane Smith" {
		t.Errorf("expected customer_name 'Jane Smith', got %v", payloadMap["customer_name"])
	}

	if actualTotal, ok := payloadMap["total_amount"].(float64); !ok || actualTotal != 249.50 {
		t.Errorf("expected total_amount 249.50, got %v", payloadMap["total_amount"])
	}

	conn3.SetReadDeadline(time.Now().Add(150 * time.Millisecond))
	var isolated models.WebSocketEvent
	if err := conn3.ReadJSON(&isolated); err == nil {
		t.Errorf("Store 3 client unexpectedly received Store 2 event: %+v", isolated)
	}
}

func TestWebSocket_CycleCountUpdated_AC2(t *testing.T) {
	jwtSecret := []byte("test_secret_key_1234567890123456")
	server, hub := setupTestWSServer(jwtSecret)
	defer server.Close()
	defer hub.Stop()

	token, err := utils.GenerateAccessToken(102, "counter2@store2.com", models.RoleSales, jwtSecret)
	if err != nil {
		t.Fatalf("failed to generate access token: %v", err)
	}

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/api/v1/ws?token=" + token + "&store_id=2"
	conn, resp, err := gorilla.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("failed to dial websocket: %v", err)
	}
	defer conn.Close()

	if resp.StatusCode != http.StatusSwitchingProtocols {
		t.Fatalf("expected HTTP 101 Switching Protocols, got %d", resp.StatusCode)
	}

	deadline := time.Now().Add(time.Second)
	for hub.StoreClientCount(2) != 1 && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	if hub.StoreClientCount(2) != 1 {
		t.Fatalf("expected 1 registered client for store 2, got %d", hub.StoreClientCount(2))
	}

	empRepo := &testEmployeeRepo{
		emp: &models.Employee{
			EmployeeId: 15,
			EmployeeBase: models.EmployeeBase{
				StoreId: 2,
				Role:    models.RoleSales,
			},
		},
	}
	cycleRepo := &testCycleCountRepo{
		count: &models.CycleCount{
			CountId:           301,
			StoreId:           2,
			CategoryId:        4,
			CategoryName:      "Audio & Headphones",
			Status:            models.CycleCountStatusInProgress,
			TotalItems:        45,
			CountedItems:      12,
			TotalVarianceCost: -35.50,
		},
	}
	cycleService := service.NewCycleCountService(cycleRepo, empRepo, nil, nil, nil, nil, hub)

	count, err := cycleService.StartCount(context.Background(), "counter2@store2.com", 4)
	if err != nil {
		t.Fatalf("StartCount failed: %v", err)
	}
	if count.CountId != 301 {
		t.Fatalf("expected count ID 301, got %d", count.CountId)
	}

	conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	var received models.WebSocketEvent
	if err := conn.ReadJSON(&received); err != nil {
		t.Fatalf("failed to read JSON event from websocket: %v", err)
	}

	if received.Type != models.EventCycleCountUpdated {
		t.Errorf("expected event type %s, got %s", models.EventCycleCountUpdated, received.Type)
	}
	if received.StoreId != 2 {
		t.Errorf("expected store_id 2, got %d", received.StoreId)
	}

	payloadMap, ok := received.Payload.(map[string]any)
	if !ok {
		t.Fatalf("expected payload to be map[string]any, got %T", received.Payload)
	}

	if countIDVal, ok := payloadMap["count_id"]; !ok {
		t.Errorf("payload missing count_id")
	} else {
		var actualID int
		switch v := countIDVal.(type) {
		case float64:
			actualID = int(v)
		case int:
			actualID = v
		}
		if actualID != 301 {
			t.Errorf("expected count_id 301, got %d", actualID)
		}
	}

	if actualCategory, ok := payloadMap["category_name"].(string); !ok || actualCategory != "Audio & Headphones" {
		t.Errorf("expected category_name 'Audio & Headphones', got %v", payloadMap["category_name"])
	}

	if actualAction, ok := payloadMap["action"].(string); !ok || actualAction != "started" {
		t.Errorf("expected action 'started', got %v", payloadMap["action"])
	}

	if totalItemsVal, ok := payloadMap["total_items"]; !ok {
		t.Errorf("payload missing total_items")
	} else {
		var actualTotal int
		switch v := totalItemsVal.(type) {
		case float64:
			actualTotal = int(v)
		case int:
			actualTotal = v
		}
		if actualTotal != 45 {
			t.Errorf("expected total_items 45, got %d", actualTotal)
		}
	}

	if countedItemsVal, ok := payloadMap["counted_items"]; !ok {
		t.Errorf("payload missing counted_items")
	} else {
		var actualCounted int
		switch v := countedItemsVal.(type) {
		case float64:
			actualCounted = int(v)
		case int:
			actualCounted = v
		}
		if actualCounted != 12 {
			t.Errorf("expected counted_items 12, got %d", actualCounted)
		}
	}

	if varianceCostVal, ok := payloadMap["total_variance_cost"]; !ok {
		t.Errorf("payload missing total_variance_cost")
	} else {
		var actualVariance float64
		switch v := varianceCostVal.(type) {
		case float64:
			actualVariance = v
		case int:
			actualVariance = float64(v)
		}
		if actualVariance != -35.50 {
			t.Errorf("expected total_variance_cost -35.50, got %f", actualVariance)
		}
	}
}

func TestWebSocket_StoreIsolation_AC1_AC2(t *testing.T) {
	jwtSecret := []byte("test_secret_key_1234567890123456")
	server, hub := setupTestWSServer(jwtSecret)
	defer server.Close()
	defer hub.Stop()

	t.Run("Store2_Event_Not_Leaked_To_Store3", func(t *testing.T) {
		token2, _ := utils.GenerateAccessToken(201, "emp2@store2.com", models.RoleSales, jwtSecret)
		wsURL2 := "ws" + strings.TrimPrefix(server.URL, "http") + "/api/v1/ws?token=" + token2 + "&store_id=2"
		conn2, _, err := gorilla.DefaultDialer.Dial(wsURL2, nil)
		if err != nil {
			t.Fatalf("failed to dial store 2 socket: %v", err)
		}
		defer conn2.Close()

		token3, _ := utils.GenerateAccessToken(301, "emp3@store3.com", models.RoleSales, jwtSecret)
		wsURL3 := "ws" + strings.TrimPrefix(server.URL, "http") + "/api/v1/ws?token=" + token3 + "&store_id=3"
		conn3, _, err := gorilla.DefaultDialer.Dial(wsURL3, nil)
		if err != nil {
			t.Fatalf("failed to dial store 3 socket: %v", err)
		}
		defer conn3.Close()

		deadline := time.Now().Add(time.Second)
		for (hub.StoreClientCount(2) != 1 || hub.StoreClientCount(3) != 1) && time.Now().Before(deadline) {
			time.Sleep(10 * time.Millisecond)
		}

		hub.BroadcastToStore(2, models.WebSocketEvent{
			Type:      models.EventOrderCreated,
			StoreId:   2,
			Timestamp: time.Now().UTC(),
			Payload: models.OrderCreatedPayload{
				OrderId:      8888,
				CustomerName: "Store 2 Buyer",
				TotalAmount:  99.99,
			},
		})

		conn2.SetReadDeadline(time.Now().Add(time.Second))
		var event2 models.WebSocketEvent
		if err := conn2.ReadJSON(&event2); err != nil {
			t.Fatalf("conn2 failed to read store 2 event: %v", err)
		}
		if event2.Type != models.EventOrderCreated || event2.StoreId != 2 {
			t.Errorf("expected Store 2 order_created, got type %s store %d", event2.Type, event2.StoreId)
		}

		conn3.SetReadDeadline(time.Now().Add(150 * time.Millisecond))
		var leakEvent models.WebSocketEvent
		if err := conn3.ReadJSON(&leakEvent); err == nil {
			t.Fatalf("isolation breach: conn3 received store 2 event: %+v", leakEvent)
		}
	})

	t.Run("Store3_Event_Not_Leaked_To_Store2", func(t *testing.T) {
		token2, _ := utils.GenerateAccessToken(202, "emp2b@store2.com", models.RoleSales, jwtSecret)
		wsURL2 := "ws" + strings.TrimPrefix(server.URL, "http") + "/api/v1/ws?token=" + token2 + "&store_id=2"
		conn2, _, err := gorilla.DefaultDialer.Dial(wsURL2, nil)
		if err != nil {
			t.Fatalf("failed to dial store 2 socket: %v", err)
		}
		defer conn2.Close()

		token3, _ := utils.GenerateAccessToken(302, "emp3b@store3.com", models.RoleSales, jwtSecret)
		wsURL3 := "ws" + strings.TrimPrefix(server.URL, "http") + "/api/v1/ws?token=" + token3 + "&store_id=3"
		conn3, _, err := gorilla.DefaultDialer.Dial(wsURL3, nil)
		if err != nil {
			t.Fatalf("failed to dial store 3 socket: %v", err)
		}
		defer conn3.Close()

		deadline := time.Now().Add(time.Second)
		for (hub.StoreClientCount(2) != 1 || hub.StoreClientCount(3) != 1) && time.Now().Before(deadline) {
			time.Sleep(10 * time.Millisecond)
		}

		hub.BroadcastToStore(3, models.WebSocketEvent{
			Type:      models.EventCycleCountUpdated,
			StoreId:   3,
			Timestamp: time.Now().UTC(),
			Payload: models.CycleCountUpdatedPayload{
				CountId: 7777,
				Status:  "IN PROGRESS",
				Action:  "scanned",
			},
		})

		conn3.SetReadDeadline(time.Now().Add(time.Second))
		var event3 models.WebSocketEvent
		if err := conn3.ReadJSON(&event3); err != nil {
			t.Fatalf("conn3 failed to read store 3 event: %v", err)
		}
		if event3.Type != models.EventCycleCountUpdated || event3.StoreId != 3 {
			t.Errorf("expected Store 3 cycle_count_updated, got type %s store %d", event3.Type, event3.StoreId)
		}

		conn2.SetReadDeadline(time.Now().Add(150 * time.Millisecond))
		var leakEvent models.WebSocketEvent
		if err := conn2.ReadJSON(&leakEvent); err == nil {
			t.Fatalf("isolation breach: conn2 received store 3 event: %+v", leakEvent)
		}
	})
}

