package repository

import (
	"context"
	"database/sql"
	"net/url"
	"os"
	"radius/internal/models"
	"strconv"
	"strings"
	"sync/atomic"
	"testing"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func integrationDB(t *testing.T) *sql.DB {
	t.Helper()
	connection := os.Getenv("RADIUS_TEST_DATABASE_URL")
	if connection == "" {
		t.Skip("RADIUS_TEST_DATABASE_URL is not set")
	}
	parsed, err := url.Parse(connection)
	if err != nil || strings.TrimPrefix(parsed.Path, "/") != "radius_ci" || parsed.Hostname() != "localhost" {
		t.Fatal("integration tests require the isolated localhost radius_ci database")
	}
	db, err := sql.Open("pgx", connection)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	if err := db.PingContext(context.Background()); err != nil {
		t.Fatal(err)
	}
	return db
}

func insertID(t *testing.T, db *sql.DB, query string, args ...any) int {
	t.Helper()
	var id int
	if err := db.QueryRowContext(context.Background(), query, args...).Scan(&id); err != nil {
		t.Fatal(err)
	}
	return id
}

type inventoryFixture struct {
	fromStore int
	toStore   int
	employee  int
	supplier  int
	product   int
}

var fixtureSequence atomic.Int64

func newInventoryFixture(t *testing.T, db *sql.DB) inventoryFixture {
	t.Helper()
	unique := strconv.FormatInt(fixtureSequence.Add(1), 10)
	fromStore := insertID(t, db, `INSERT INTO stores (name,address,city,province,postal_code,phone) VALUES ($1,'1 Test St','Toronto','ON',$2,$3) RETURNING store_id`, "Test From "+unique, "A1A "+unique, "555"+unique)
	toStore := insertID(t, db, `INSERT INTO stores (name,address,city,province,postal_code,phone) VALUES ($1,'2 Test St','Ottawa','ON',$2,$3) RETURNING store_id`, "Test To "+unique, "B2B "+unique, "556"+unique)
	employee := insertID(t, db, `INSERT INTO employees (email,store_id,first_name,last_name,role,password_hash,phone,address,city,province,postal_code) VALUES ($1,$2,'Test','Employee','ADMIN','hash',$3,'1 Test St','Toronto','ON','A1A 1A1') RETURNING employee_id`, unique+"@example.invalid", fromStore, "557"+unique)
	supplier := insertID(t, db, `INSERT INTO suppliers (name,contact_email) VALUES ($1,$2) RETURNING supplier_id`, "Supplier "+unique, unique+"@example.invalid")
	product := insertID(t, db, `INSERT INTO products (sku,upc,name,brand,weight) VALUES ($1,$2,'Integration Product','Test',1) RETURNING product_id`, "S"+unique, "U"+unique)
	if _, err := db.ExecContext(context.Background(), `INSERT INTO product_suppliers (product_id,supplier_id,supplier_sku,cost_price,is_primary) VALUES ($1,$2,$3,12.50,true)`, product, supplier, "PS"+unique); err != nil {
		t.Fatal(err)
	}
	return inventoryFixture{fromStore, toStore, employee, supplier, product}
}

func TestTransferRepositoryIntegration(t *testing.T) {
	db := integrationDB(t)
	f := newInventoryFixture(t, db)
	ctx := context.Background()
	if _, err := db.ExecContext(ctx, `INSERT INTO inventory (store_id,product_id,new_qty) VALUES ($1,$2,10)`, f.fromStore, f.product); err != nil {
		t.Fatal(err)
	}
	repo := NewTransferRepo(db)
	transfer, err := repo.CreateTransfer(ctx, f.fromStore, f.toStore, f.employee, "replenish", false, []models.CreateTransferItemEntry{{ProductId: f.product, QtyRequested: 3}})
	if err != nil {
		t.Fatal(err)
	}
	var newQty, onHand, available, inTransit int
	if err := db.QueryRowContext(ctx, `SELECT new_qty,on_hand_qty,available_qty,in_transit_qty FROM inventory WHERE store_id=$1 AND product_id=$2`, f.fromStore, f.product).Scan(&newQty, &onHand, &available, &inTransit); err != nil {
		t.Fatal(err)
	}
	if newQty != 7 || onHand != 7 || available != 7 || inTransit != 3 {
		t.Fatalf("inventory after transfer = %d/%d/%d/%d", newQty, onHand, available, inTransit)
	}
	var cost float64
	if err := db.QueryRowContext(ctx, `SELECT total_transfer_cost FROM stock_transfers WHERE transfer_id=$1`, transfer.TransferId).Scan(&cost); err != nil {
		t.Fatal(err)
	}
	if cost != 37.50 {
		t.Fatalf("transfer cost = %.2f, want 37.50", cost)
	}
	var ledgerCount int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM inventory_transactions WHERE reference_id=$1 AND transaction_type='TRANSFER' AND quantity=3`, "TRANSFER:"+strconv.Itoa(transfer.TransferId)).Scan(&ledgerCount); err != nil {
		t.Fatal(err)
	}
	if ledgerCount != 1 {
		t.Fatalf("transfer ledger entries = %d, want 1", ledgerCount)
	}
	if _, err := repo.CreateTransfer(ctx, f.fromStore, f.toStore, f.employee, "too many", false, []models.CreateTransferItemEntry{{ProductId: f.product, QtyRequested: 8}}); err == nil {
		t.Fatal("expected insufficient inventory error")
	}
	if err := db.QueryRowContext(ctx, `SELECT new_qty FROM inventory WHERE store_id=$1 AND product_id=$2`, f.fromStore, f.product).Scan(&newQty); err != nil || newQty != 7 {
		t.Fatalf("failed transfer changed stock: qty=%d err=%v", newQty, err)
	}
}

func TestReceivingRepositoryIntegration(t *testing.T) {
	db := integrationDB(t)
	f := newInventoryFixture(t, db)
	ctx := context.Background()
	if _, err := db.ExecContext(ctx, `INSERT INTO inventory (store_id,product_id,new_qty) VALUES ($1,$2,2)`, f.fromStore, f.product); err != nil {
		t.Fatal(err)
	}
	po := insertID(t, db, `INSERT INTO purchase_orders (store_id,supplier_id,status,ordered_at,created_by) VALUES ($1,$2,'SHIPPED',NOW(),$3) RETURNING po_id`, f.fromStore, f.supplier, f.employee)
	item := insertID(t, db, `INSERT INTO purchase_orders_items (po_id,product_id,qty_ordered,unit_cost) VALUES ($1,$2,5,12.50) RETURNING po_item_id`, po, f.product)
	if err := NewReceivingRepo(db).ReceivePOItems(ctx, f.fromStore, po, f.employee, []models.ReceivePOItemEntry{{PoItemId: item, QtyReceived: 3}}); err != nil {
		t.Fatal(err)
	}
	var newQty, onHand, available, received int
	var status string
	if err := db.QueryRowContext(ctx, `SELECT new_qty,on_hand_qty,available_qty FROM inventory WHERE store_id=$1 AND product_id=$2`, f.fromStore, f.product).Scan(&newQty, &onHand, &available); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRowContext(ctx, `SELECT qty_received FROM purchase_orders_items WHERE po_item_id=$1`, item).Scan(&received); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRowContext(ctx, `SELECT status FROM purchase_orders WHERE po_id=$1`, po).Scan(&status); err != nil {
		t.Fatal(err)
	}
	if newQty != 5 || onHand != 5 || available != 5 || received != 3 || status != "PARTIAL" {
		t.Fatalf("receipt state = %d/%d/%d received=%d status=%s", newQty, onHand, available, received, status)
	}
	var ledgerCount int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM inventory_transactions WHERE product_id=$1 AND transaction_type='RECEIPT' AND quantity=3`, f.product).Scan(&ledgerCount); err != nil {
		t.Fatal(err)
	}
	if ledgerCount != 1 {
		t.Fatalf("receipt ledger entries = %d, want 1", ledgerCount)
	}
}

func TestOrderRepositoryStoreScopeIntegration(t *testing.T) {
	db := integrationDB(t)
	f := newInventoryFixture(t, db)
	ctx := context.Background()
	onlineID := insertID(t, db, `INSERT INTO online_orders (store_id,customer_email,customer_name,order_type,status,subtotal,tax_amount,shipping_fee,total_amount,shipping_address) VALUES ($1,'customer@example.invalid','Customer','BOPIS','WORK IN PROGRESS',10,1,0,11,'Test Address') RETURNING order_id`, f.toStore)
	printID := insertID(t, db, `INSERT INTO print_orders (store_id,customer_name,order_type,subtotal,tax_amount,total_amount) VALUES ($1,'Customer','WALK_IN',10,1,11) RETURNING print_order_id`, f.toStore)
	repo := NewOrdersRepo(db)
	if order, _, err := repo.GetOnlineOrderByID(ctx, onlineID, &f.fromStore); err != nil || order != nil {
		t.Fatalf("cross-store online order = %v, err %v", order, err)
	}
	if order, _, err := repo.GetPrintOrderByID(ctx, printID, &f.fromStore); err != nil || order != nil {
		t.Fatalf("cross-store print order = %v, err %v", order, err)
	}
	if _, count, err := repo.GetAllOnlineOrders(ctx, 10, 0, &f.fromStore, models.OrderSearchCriteria{}); err != nil || count != 0 {
		t.Fatalf("cross-store online list count = %d, err %v", count, err)
	}
	if _, count, err := repo.GetAllPrintOrders(ctx, 10, 0, &f.fromStore, models.PrintOrderSearchCriteria{}); err != nil || count != 0 {
		t.Fatalf("cross-store print list count = %d, err %v", count, err)
	}
	if order, _, err := repo.GetOnlineOrderByID(ctx, onlineID, &f.toStore); err != nil || order == nil {
		t.Fatalf("same-store online order = %v, err %v", order, err)
	}
	if order, _, err := repo.GetPrintOrderByID(ctx, printID, &f.toStore); err != nil || order == nil {
		t.Fatalf("same-store print order = %v, err %v", order, err)
	}
}

func TestCycleCountRepositoryIntegration(t *testing.T) {
	db := integrationDB(t)
	f := newInventoryFixture(t, db)
	ctx := context.Background()
	category := insertID(t, db, `INSERT INTO categories (name) VALUES ('Integration Category') RETURNING category_id`)
	if _, err := db.ExecContext(ctx, `UPDATE products SET category_id=$1 WHERE product_id=$2`, category, f.product); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `INSERT INTO inventory (store_id,product_id,new_qty) VALUES ($1,$2,8)`, f.fromStore, f.product); err != nil {
		t.Fatal(err)
	}
	repo := NewCycleCountRepo(db)
	count, err := repo.StartCycleCount(ctx, f.fromStore, category, f.employee)
	if err != nil {
		t.Fatal(err)
	}
	if count == nil || count.TotalItems != 1 {
		t.Fatalf("started count = %+v", count)
	}
	var expected int
	if err := db.QueryRowContext(ctx, `SELECT expected_qty FROM cycle_count_items WHERE count_id=$1 AND product_id=$2`, count.CountId, f.product).Scan(&expected); err != nil || expected != 8 {
		t.Fatalf("expected count quantity = %d, err %v", expected, err)
	}
	if other, err := repo.GetCycleCountByID(ctx, count.CountId, f.toStore); err != nil || other != nil {
		t.Fatalf("cross-store count = %v, err %v", other, err)
	}
}

func TestReturnsRepositoryIntegration(t *testing.T) {
	db := integrationDB(t)
	f := newInventoryFixture(t, db)
	ctx := context.Background()
	if _, err := db.ExecContext(ctx, `INSERT INTO inventory (store_id,product_id,new_qty) VALUES ($1,$2,2)`, f.fromStore, f.product); err != nil {
		t.Fatal(err)
	}
	repo := NewReturnsRepo(db)
	created, items, err := repo.CreateReturn(ctx, f.fromStore, f.employee, models.ReturnStatusCompleted, models.CreateReturnRequest{
		RefundMethod: models.RefundMethodCash,
		Items:        []models.CreateReturnItemRequest{{ProductId: f.product, Quantity: 1, UnitPrice: 2000, ReturnReason: "Customer return", Disposition: models.ReturnDispositionRestock}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if created == nil || len(items) != 1 {
		t.Fatalf("created return = %v, items = %d", created, len(items))
	}
	if created.Subtotal != 2000 || created.TaxAmount != 100 || created.TotalRefund != 2100 || items[0].TaxAmount != 100 {
		t.Fatalf("return money = subtotal %s tax %s refund %s item tax %s", created.Subtotal, created.TaxAmount, created.TotalRefund, items[0].TaxAmount)
	}
	var newQty, onHand, ledger int
	if err := db.QueryRowContext(ctx, `SELECT new_qty,on_hand_qty FROM inventory WHERE store_id=$1 AND product_id=$2`, f.fromStore, f.product).Scan(&newQty, &onHand); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM inventory_transactions WHERE product_id=$1 AND to_store_id=$2 AND transaction_type='RETURN'`, f.product, f.fromStore).Scan(&ledger); err != nil {
		t.Fatal(err)
	}
	if newQty != 3 || onHand != 3 || ledger != 1 {
		t.Fatalf("return inventory = %d/%d, ledger = %d", newQty, onHand, ledger)
	}
}
