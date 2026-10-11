package repository

import (
	"context"
	"database/sql"
	"radius/internal/models"
	"strconv"
	"testing"
)

func newTaxedStore(t *testing.T, db *sql.DB, province string) int {
	t.Helper()
	unique := strconv.FormatInt(fixtureSequence.Add(1), 10)
	return insertID(t, db, `INSERT INTO stores (name,address,city,province,postal_code,phone) VALUES ($1,'3 Test St','Test City',$2,$3,$4) RETURNING store_id`, "Taxed "+unique, province, "C3C "+unique, "558"+unique)
}

func TestSalesRepositoryCreateTransactionComputesMoneyIntegration(t *testing.T) {
	db := integrationDB(t)
	f := newInventoryFixture(t, db)
	ctx := context.Background()
	store := newTaxedStore(t, db, "British Columbia")
	if _, err := db.ExecContext(ctx, `UPDATE products SET retail_price=19.99 WHERE product_id=$1`, f.product); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `INSERT INTO inventory (store_id,product_id,new_qty) VALUES ($1,$2,10)`, store, f.product); err != nil {
		t.Fatal(err)
	}

	created, items, err := NewSalesRepo(db).CreateTransaction(ctx, store, &f.employee, models.CreateTransactionRequest{
		RegisterId:  "REG-INT",
		Subtotal:    1,
		TotalAmount: 1,
		Items:       []models.CreateTransactionItemRequest{{ProductId: f.product, Quantity: 3, UnitPrice: 1}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if created.Subtotal != 5997 || created.TaxAmount != 720 || created.TotalAmount != 6717 || created.CostTotal != 3750 {
		t.Fatalf("computed money = subtotal %s tax %s total %s cost %s", created.Subtotal, created.TaxAmount, created.TotalAmount, created.CostTotal)
	}
	if len(items) != 1 || items[0].UnitPrice != 1999 || items[0].UnitCost != 1250 {
		t.Fatalf("computed items = %+v", items)
	}

	var subtotal, tax, total, unitPrice models.Money
	if err := db.QueryRowContext(ctx, `SELECT subtotal,tax_amount,total_amount FROM transactions WHERE transaction_id=$1`, created.TransactionId).Scan(&subtotal, &tax, &total); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRowContext(ctx, `SELECT unit_price FROM transaction_items WHERE transaction_id=$1`, created.TransactionId).Scan(&unitPrice); err != nil {
		t.Fatal(err)
	}
	if subtotal != 5997 || tax != 720 || total != 6717 || unitPrice != 1999 {
		t.Fatalf("stored money = subtotal %s tax %s total %s unit %s", subtotal, tax, total, unitPrice)
	}
}

func TestSalesRepositoryCreateTransactionRejectsZeroTotalIntegration(t *testing.T) {
	db := integrationDB(t)
	f := newInventoryFixture(t, db)
	ctx := context.Background()
	store := newTaxedStore(t, db, "Quebec")
	if _, err := db.ExecContext(ctx, `INSERT INTO inventory (store_id,product_id,new_qty) VALUES ($1,$2,10)`, store, f.product); err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name        string
		retailPrice string
		items       []models.CreateTransactionItemRequest
	}{
		{name: "zero retail price", retailPrice: "0", items: []models.CreateTransactionItemRequest{{ProductId: f.product, Quantity: 1, UnitPrice: 100000}}},
		{name: "null retail price", retailPrice: "", items: []models.CreateTransactionItemRequest{{ProductId: f.product, Quantity: 1}}},
		{name: "zero quantity", retailPrice: "10.00", items: []models.CreateTransactionItemRequest{{ProductId: f.product, Quantity: 0}}},
		{name: "no items", retailPrice: "10.00", items: nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var price any
			if tt.retailPrice != "" {
				price = tt.retailPrice
			}
			if _, err := db.ExecContext(ctx, `UPDATE products SET retail_price=$1 WHERE product_id=$2`, price, f.product); err != nil {
				t.Fatal(err)
			}
			if _, _, err := NewSalesRepo(db).CreateTransaction(ctx, store, &f.employee, models.CreateTransactionRequest{
				RegisterId:  "REG-INT",
				TotalAmount: 100000,
				Items:       tt.items,
			}); err == nil {
				t.Fatal("expected transaction to be rejected")
			}
			var count, qty int
			if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM transactions WHERE store_id=$1`, store).Scan(&count); err != nil {
				t.Fatal(err)
			}
			if err := db.QueryRowContext(ctx, `SELECT new_qty FROM inventory WHERE store_id=$1 AND product_id=$2`, store, f.product).Scan(&qty); err != nil {
				t.Fatal(err)
			}
			if count != 0 || qty != 10 {
				t.Fatalf("rejected transaction left state: transactions=%d qty=%d", count, qty)
			}
		})
	}
}
