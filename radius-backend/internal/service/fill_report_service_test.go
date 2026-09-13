package service_test

import (
	"context"
	"radius/internal/models"
	"radius/internal/service"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

type MockFillReportRepo struct {
	GetActiveFillReportForStoreFunc func(ctx context.Context, storeID int, filter models.FillReportFilter) (*models.FillReport, []models.FillReportItemDetail, error)
	AddEmptyHoleFunc                func(ctx context.Context, storeID int, productID int, employeeID *int) error
	AddSoldItemsFunc                func(ctx context.Context, storeID int, items []models.TransactionItem) error
}

func (m *MockFillReportRepo) GetActiveFillReportForStore(ctx context.Context, storeID int, filter models.FillReportFilter) (*models.FillReport, []models.FillReportItemDetail, error) {
	if m.GetActiveFillReportForStoreFunc != nil {
		return m.GetActiveFillReportForStoreFunc(ctx, storeID, filter)
	}
	return &models.FillReport{FillReportId: 1, StoreId: storeID, Status: "OPEN"}, []models.FillReportItemDetail{}, nil
}

func (m *MockFillReportRepo) AddEmptyHole(ctx context.Context, storeID int, productID int, employeeID *int) error {
	if m.AddEmptyHoleFunc != nil {
		return m.AddEmptyHoleFunc(ctx, storeID, productID, employeeID)
	}
	return nil
}

func (m *MockFillReportRepo) AddSoldItems(ctx context.Context, storeID int, items []models.TransactionItem) error {
	if m.AddSoldItemsFunc != nil {
		return m.AddSoldItemsFunc(ctx, storeID, items)
	}
	return nil
}

func setupFillReportTestRedis() *redis.Client {
	s, err := miniredis.Run()
	if err != nil {
		panic(err)
	}
	return redis.NewClient(&redis.Options{
		Addr: s.Addr(),
	})
}

func TestFillReportService_GetStoreFillReport(t *testing.T) {
	mockRepo := &MockFillReportRepo{}
	rdb := setupFillReportTestRedis()

	aisle := "A01"
	loc := "01-02-03-004"
	now := time.Now()

	mockRepo.GetActiveFillReportForStoreFunc = func(ctx context.Context, storeID int, filter models.FillReportFilter) (*models.FillReport, []models.FillReportItemDetail, error) {
		return &models.FillReport{
				FillReportId: 10,
				StoreId:      storeID,
				ReportDate:   now,
				Status:       models.FillReportStatusOpen,
			}, []models.FillReportItemDetail{
				{
					FillItemId:     1,
					FillReportId:   10,
					ProductId:      101,
					ProductName:    "Coffee Beans 1kg",
					ProductSku:     "SKU101",
					ProductUpc:     "012345678901",
					Brand:          "Radius Roast",
					Aisle:          &aisle,
					MimsLocationId: &loc,
					OnHandQty:      5,
					AvailableQty:   5,
					FillQty:        8,
					IsEmptyHole:    false,
				},
				{
					FillItemId:     2,
					FillReportId:   10,
					ProductId:      102,
					ProductName:    "Paper Towels 6pk",
					ProductSku:     "SKU102",
					ProductUpc:     "012345678902",
					Brand:          "CleanCo",
					Aisle:          &aisle,
					MimsLocationId: &loc,
					OnHandQty:      -2,
					AvailableQty:   -2,
					FillQty:        0,
					IsEmptyHole:    true,
				},
			}, nil
	}

	fillService := service.NewFillReportService(mockRepo, nil, nil, nil, nil, nil, rdb)

	resp, err := fillService.GetStoreFillReport(context.Background(), 1, models.FillReportFilter{})
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if resp.TotalItems != 2 {
		t.Errorf("Expected 2 total items, got %d", resp.TotalItems)
	}
	if resp.FillQtySum != 8 {
		t.Errorf("Expected FillQtySum of 8, got %d", resp.FillQtySum)
	}
	if resp.Is4tcCount != 1 {
		t.Errorf("Expected Is4tcCount of 1, got %d", resp.Is4tcCount)
	}
	if len(resp.Items) != 2 {
		t.Errorf("Expected 2 items in array, got %d", len(resp.Items))
	}
}

func TestFillReportService_IS4TCSessionAndAutoLog(t *testing.T) {
	mockRepo := &MockFillReportRepo{}
	rdb := setupFillReportTestRedis()

	emptyHolesLogged := 0
	mockRepo.AddEmptyHoleFunc = func(ctx context.Context, storeID int, productID int, employeeID *int) error {
		emptyHolesLogged++
		return nil
	}

	fillService := service.NewFillReportService(mockRepo, nil, nil, nil, nil, nil, rdb)

	product1 := models.MimsProductInventory{
		ProductId: 201,
		Sku:       "SKU201",
		Upc:       "098765432101",
		Name:      "Wireless Mouse",
		OnHandQty: 10,
	}

	items, err := fillService.AddToIS4TCSession(context.Background(), 1, product1, nil)
	if err != nil {
		t.Fatalf("Unexpected error adding to IS4TC session: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("Expected 1 item in session, got %d", len(items))
	}
	if emptyHolesLogged != 1 {
		t.Errorf("Expected empty hole to be auto-logged to DB, got %d calls", emptyHolesLogged)
	}

	sessionItems, err := fillService.GetActiveIS4TCSession(context.Background(), 1)
	if err != nil {
		t.Fatalf("Failed to get session items: %v", err)
	}
	if len(sessionItems) != 1 || sessionItems[0].ProductId != 201 {
		t.Errorf("Session item mismatch: %+v", sessionItems)
	}

	err = fillService.ClearIS4TCSession(context.Background(), 1)
	if err != nil {
		t.Fatalf("Failed to clear session: %v", err)
	}

	clearedItems, err := fillService.GetActiveIS4TCSession(context.Background(), 1)
	if err != nil {
		t.Fatalf("Failed to get cleared session: %v", err)
	}
	if len(clearedItems) != 0 {
		t.Errorf("Expected 0 items after clear, got %d", len(clearedItems))
	}
}
