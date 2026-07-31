// radius-backend/internal/repository/orders_repo.go
package repository

import (
	"context"
	"database/sql"
	"radius/internal/models"
)

type OrdersRepo struct {
	db *sql.DB
}

func NewOrdersRepo(db *sql.DB) *OrdersRepo {
	return &OrdersRepo{db: db}
}

func (r *OrdersRepo) GetAllOnlineOrders(ctx context.Context, limit, offset int, storeID *int) ([]models.OnlineOrder, int, error) {
	var countQuery string
	var query string
	var args []any
	var countArgs []any

	if storeID != nil {
		countQuery = `
			SELECT COUNT(*) 
			FROM online_orders 
			WHERE store_id = $1
		`
		query = `
			SELECT order_id, store_id, customer_email, customer_name, order_type, status, placed_at, fulfilled_at, subtotal, tax_amount, shipping_fee, total_amount, shipping_address 
			FROM online_orders 
			WHERE store_id = $1 
			ORDER BY placed_at DESC 
			LIMIT $2 OFFSET $3
		`
		args = []any{*storeID, limit, offset}
		countArgs = []any{*storeID}
	} else {
		countQuery = `
			SELECT COUNT(*) 
			FROM online_orders
		`
		query = `
			SELECT order_id, store_id, customer_email, customer_name, order_type, status, placed_at, fulfilled_at, subtotal, tax_amount, shipping_fee, total_amount, shipping_address 
			FROM online_orders 
			ORDER BY placed_at DESC 
			LIMIT $1 OFFSET $2
		`
		args = []any{limit, offset}
		countArgs = []any{}
	}

	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var orders []models.OnlineOrder
	for rows.Next() {
		var o models.OnlineOrder
		if err := rows.Scan(
			&o.OrderId, &o.StoreId, &o.CustomerEmail, &o.CustomerName, &o.OrderType,
			&o.Status, &o.PlacedAt, &o.FulfilledAt, &o.Subtotal, &o.TaxAmount,
			&o.ShippingFee, &o.TotalAmount, &o.ShippingAddress,
		); err != nil {
			return nil, 0, err
		}
		orders = append(orders, o)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	
	if orders == nil {
		orders = []models.OnlineOrder{}
	}

	return orders, total, nil
}

func (r *OrdersRepo) GetOnlineOrderByID(ctx context.Context, id int, storeID *int) (*models.OnlineOrder, []models.OnlineOrderItem, error) {
	var query string
	var args []any

	if storeID != nil {
		query = `
			SELECT order_id, store_id, customer_email, customer_name, order_type, status, placed_at, fulfilled_at, subtotal, tax_amount, shipping_fee, total_amount, shipping_address 
			FROM online_orders 
			WHERE order_id = $1 AND store_id = $2
		`
		args = []any{id, *storeID}
	} else {
		query = `
			SELECT order_id, store_id, customer_email, customer_name, order_type, status, placed_at, fulfilled_at, subtotal, tax_amount, shipping_fee, total_amount, shipping_address 
			FROM online_orders 
			WHERE order_id = $1
		`
		args = []any{id}
	}

	var o models.OnlineOrder
	err := r.db.QueryRowContext(ctx, query, args...).Scan(
		&o.OrderId, &o.StoreId, &o.CustomerEmail, &o.CustomerName, &o.OrderType,
		&o.Status, &o.PlacedAt, &o.FulfilledAt, &o.Subtotal, &o.TaxAmount,
		&o.ShippingFee, &o.TotalAmount, &o.ShippingAddress,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil, nil // Not found
		}
		return nil, nil, err
	}

	itemQuery := `
		SELECT order_item_id, order_id, product_id, quantity, unit_price, picked_qty 
		FROM online_order_items 
		WHERE order_id = $1
	`
	rows, err := r.db.QueryContext(ctx, itemQuery, id)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	var items []models.OnlineOrderItem
	for rows.Next() {
		var i models.OnlineOrderItem
		if err := rows.Scan(
			&i.OrderItemId, &i.OrderId, &i.ProductId, &i.Quantity, &i.UnitPrice, &i.PickedQty,
		); err != nil {
			return nil, nil, err
		}
		items = append(items, i)
	}

	if err := rows.Err(); err != nil {
		return nil, nil, err
	}
	
	if items == nil {
		items = []models.OnlineOrderItem{}
	}

	return &o, items, nil
}
