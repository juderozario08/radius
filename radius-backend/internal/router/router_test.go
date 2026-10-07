package router_test

import (
	"testing"

	"radius/internal/config"
	"radius/internal/handler"
	"radius/internal/router"
	"radius/internal/service"
)

func TestNewRouter_NoPanics(t *testing.T) {
	cfg := &config.Config{
		GinMode: "test",
	}

	appHandlers := testHandlers()

	r := router.NewRouter(router.Config{
		Handlers:    appHandlers,
		JWTSecret:   []byte("test-secret"),
		AuthService: &service.AuthService{},
		AppConfig:   cfg,
	})

	if r == nil {
		t.Fatal("expected router to not be nil")
	}
}

func testHandlers() router.Handlers {
	return router.Handlers{
		AuditHandler:       &handler.AuditHandler{},
		AuthHandler:        &handler.AuthHandler{},
		CategoryHandler:    &handler.CategoryHandler{},
		CycleCountHandler:  &handler.CycleCountHandler{},
		FillReportHandler:  &handler.FillReportHandler{},
		InventoryHandler:   &handler.InventoryHandler{},
		OnlineOrderHandler: &handler.OnlineOrderHandler{},
		ProductHandler:     &handler.ProductHandler{},
		ReceivingHandler:   &handler.ReceivingHandler{},
		StoreHandler:       &handler.StoreHandler{},
		TransactionHandler: &handler.TransactionHandler{},
		TransferHandler:    &handler.TransferHandler{},
		SessionHandler:     &handler.SessionHandler{},
		EmployeeHandler:    &handler.EmployeeHandler{},
		PrintOrderHandler:  &handler.PrintOrderHandler{},
		WSHandler:          &handler.WSHandler{},
		MetricsHandler:     &handler.MetricsHandler{},
	}
}
