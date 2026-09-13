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

	appHandlers := router.Handlers{
		AuditHandler:       &handler.AuditHandler{},
		AuthHandler:        &handler.AuthHandler{},
		BarcodeHandler:     &handler.BarcodeHandler{},
		CategoryHandler:    &handler.CategoryHandler{},
		CycleCountHandler:  &handler.CycleCountHandler{},
		FillReportHandler:  &handler.FillReportHandler{},
		InventoryHandler:   &handler.InventoryHandler{},
		OnlineOrderHandler: &handler.OnlineOrderHandler{},
		OutOfStockHandler:  &handler.OutOfStockHandler{},
		PricingHandler:     &handler.PricingHandler{},
		ProductHandler:     &handler.ProductHandler{},
		ReceivingHandler:   &handler.ReceivingHandler{},
		StoreHandler:       &handler.StoreHandler{},
		TransactionHandler: &handler.TransactionHandler{},
		TransferHandler:    &handler.TransferHandler{},
		SessionHandler:     &handler.SessionHandler{},
		EmployeeHandler:    &handler.EmployeeHandler{},
		PrintOrderHandler:  &handler.PrintOrderHandler{},
		WSHandler:          &handler.WSHandler{},
	}

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
