package repository

import (
	"context"
	"database/sql"
	"radius/internal/models"
	"radius/internal/service"
	"strings"
	"testing"
)

func newReturnsServiceIntegration(db *sql.DB) *service.ReturnsService {
	return service.NewReturnsService(NewReturnsRepo(db), NewEmployeeRepo(db), NewProductRepo(db), NewSalesRepo(db), NewStoreRepo(db))
}

func sellForReturn(t *testing.T, db *sql.DB, store int, f inventoryFixture, retailPrice string, qty int) (*models.Transaction, models.TransactionItem) {
	t.Helper()
	ctx := context.Background()
	if _, err := db.ExecContext(ctx, `UPDATE products SET retail_price=$1 WHERE product_id=$2`, retailPrice, f.product); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `INSERT INTO inventory (store_id,product_id,new_qty) VALUES ($1,$2,10)`, store, f.product); err != nil {
		t.Fatal(err)
	}
	created, items, err := NewSalesRepo(db).CreateTransaction(ctx, store, &f.employee, models.CreateTransactionRequest{
		RegisterId: "REG-INT",
		Items:      []models.CreateTransactionItemRequest{{ProductId: f.product, Quantity: qty}},
	})
	if err != nil {
		t.Fatal(err)
	}
	return created, items[0]
}

func TestReturnsReceiptRefundsTaxChargedIntegration(t *testing.T) {
	db := integrationDB(t)
	f := newInventoryFixture(t, db)
	ctx := context.Background()
	store := newTaxedStore(t, db, "British Columbia")
	sale, line := sellForReturn(t, db, store, f, "19.99", 3)
	if sale.TaxAmount != 720 {
		t.Fatalf("sale tax = %s, want 7.20", sale.TaxAmount)
	}
	txID := int64(sale.TransactionId)
	lineID := int64(line.TransactionItemId)
	svc := newReturnsServiceIntegration(db)

	returnItems := func(qty int) models.CreateReturnRequest {
		return models.CreateReturnRequest{
			OriginalTransactionId: &txID,
			RefundMethod:          models.RefundMethodCard,
			Items: []models.CreateReturnItemRequest{{
				ProductId: f.product, OriginalTransactionItemId: &lineID, Quantity: qty,
				UnitPrice: 1, ReturnReason: "DEFECTIVE", Disposition: models.ReturnDispositionRestock,
			}},
		}
	}

	first, err := svc.CreateReturn(ctx, store, f.employee, models.RoleManager, returnItems(1))
	if err != nil {
		t.Fatal(err)
	}
	if first.Subtotal != 1999 || first.TaxAmount != 240 || first.TotalRefund != 2239 {
		t.Fatalf("first return = subtotal %s tax %s total %s, want 19.99 / 2.40 / 22.39", first.Subtotal, first.TaxAmount, first.TotalRefund)
	}

	var unitPrice, itemTax, storedTax models.Money
	if err := db.QueryRowContext(ctx, `SELECT unit_price, tax_amount FROM customer_return_items WHERE return_id=$1`, first.ReturnId).Scan(&unitPrice, &itemTax); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRowContext(ctx, `SELECT tax_amount FROM customer_returns WHERE return_id=$1`, first.ReturnId).Scan(&storedTax); err != nil {
		t.Fatal(err)
	}
	if unitPrice != 1999 || itemTax != 240 || storedTax != 240 {
		t.Fatalf("stored return = unit %s item tax %s tax %s", unitPrice, itemTax, storedTax)
	}

	lookup, err := NewReturnsRepo(db).LookupTransaction(ctx, txID, &store)
	if err != nil {
		t.Fatal(err)
	}
	if lookup.Subtotal != 5997 || lookup.TaxAmount != 720 || lookup.RefundedSubtotal != 1999 || lookup.RefundedTax != 240 || lookup.RefundedTotal != 2239 {
		t.Fatalf("lookup money = %+v", lookup)
	}

	if _, err := svc.CreateReturn(ctx, store, f.employee, models.RoleManager, returnItems(3)); err == nil || !strings.Contains(err.Error(), "exceeds returnable qty") {
		t.Fatalf("expected over-quantity rejection, got %v", err)
	}

	rest, err := svc.CreateReturn(ctx, store, f.employee, models.RoleManager, returnItems(2))
	if err != nil {
		t.Fatal(err)
	}
	if rest.Subtotal != 3998 || rest.TaxAmount != 480 || first.TotalRefund+rest.TotalRefund != sale.TotalAmount {
		t.Fatalf("remaining return = subtotal %s tax %s; refunds %s vs paid %s", rest.Subtotal, rest.TaxAmount, first.TotalRefund+rest.TotalRefund, sale.TotalAmount)
	}

	var newQty int
	if err := db.QueryRowContext(ctx, `SELECT new_qty FROM inventory WHERE store_id=$1 AND product_id=$2`, store, f.product).Scan(&newQty); err != nil {
		t.Fatal(err)
	}
	if newQty != 10 {
		t.Fatalf("inventory after full restock = %d, want 10", newQty)
	}
}

func TestReturnsRepositoryRejectsOverRefundIntegration(t *testing.T) {
	db := integrationDB(t)
	f := newInventoryFixture(t, db)
	ctx := context.Background()
	store := newTaxedStore(t, db, "Ontario")
	sale, line := sellForReturn(t, db, store, f, "10.00", 2)
	txID := int64(sale.TransactionId)
	lineID := int64(line.TransactionItemId)
	repo := NewReturnsRepo(db)

	tests := []struct {
		name     string
		quantity int
		total    models.Money
		wantErr  string
	}{
		{name: "more than was paid", quantity: 1, total: sale.TotalAmount + 1, wantErr: "exceeds the"},
		{name: "more quantity than was sold", quantity: 3, total: 100, wantErr: "exceeds returnable qty"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, _, err := repo.CreateReturn(ctx, store, f.employee, models.ReturnStatusCompleted, models.CreateReturnRequest{
				OriginalTransactionId: &txID,
				RefundMethod:          models.RefundMethodCash,
				Subtotal:              tt.total,
				TotalRefund:           tt.total,
				Items: []models.CreateReturnItemRequest{{
					ProductId: f.product, OriginalTransactionItemId: &lineID, Quantity: tt.quantity,
					UnitPrice: 1000, ReturnReason: "DEFECTIVE", Disposition: models.ReturnDispositionRestock,
				}},
			})
			if err == nil || !strings.Contains(err.Error(), tt.wantErr) {
				t.Fatalf("expected error containing %q, got %v", tt.wantErr, err)
			}
			var count int
			if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM customer_returns WHERE original_transaction_id=$1`, txID).Scan(&count); err != nil {
				t.Fatal(err)
			}
			if count != 0 {
				t.Fatalf("rejected return was persisted: %d rows", count)
			}
		})
	}
}

func TestReturnsWithoutReceiptUseStoreProvinceIntegration(t *testing.T) {
	db := integrationDB(t)
	f := newInventoryFixture(t, db)
	ctx := context.Background()
	if _, err := db.ExecContext(ctx, `UPDATE products SET retail_price=10.00 WHERE product_id=$1`, f.product); err != nil {
		t.Fatal(err)
	}
	svc := newReturnsServiceIntegration(db)

	tests := []struct {
		province string
		wantTax  models.Money
	}{
		{province: "British Columbia", wantTax: 120},
		{province: "Ontario", wantTax: 130},
		{province: "Quebec", wantTax: 150},
		{province: "Alberta", wantTax: 50},
	}

	for _, tt := range tests {
		t.Run(tt.province, func(t *testing.T) {
			store := newTaxedStore(t, db, tt.province)
			ret, err := svc.CreateReturn(ctx, store, f.employee, models.RoleManager, models.CreateReturnRequest{
				RefundMethod: models.RefundMethodStoreCredit,
				Items: []models.CreateReturnItemRequest{{
					ProductId: f.product, Quantity: 1, UnitPrice: 99999,
					ReturnReason: "CHANGED_MIND", Disposition: models.ReturnDispositionOpenBox,
				}},
			})
			if err != nil {
				t.Fatal(err)
			}
			if ret.Subtotal != 1000 || ret.TaxAmount != tt.wantTax || ret.TotalRefund != 1000+tt.wantTax {
				t.Fatalf("return = subtotal %s tax %s total %s", ret.Subtotal, ret.TaxAmount, ret.TotalRefund)
			}
		})
	}
}
