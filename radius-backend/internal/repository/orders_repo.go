// radius-backend/internal/repository/orders_repo.go
package repository

import (
	"context"
	"database/sql"
	"fmt"
	"radius/internal/models"
)

type OrdersRepo struct {
	db *sql.DB
}

func NewOrdersRepo(db *sql.DB) *OrdersRepo {
	return &OrdersRepo{db: db}
}

func (r *OrdersRepo) GetAllOnlineOrders(ctx context.Context, limit, offset int, storeID *int, criteria models.OrderSearchCriteria) ([]models.OnlineOrder, int, error) {
	var countQuery string
	var query string
	var args []any
	var countArgs []any

	baseConditions := "1=1"

	if storeID != nil {
		baseConditions += " AND o.store_id = $1"
		args = append(args, *storeID)
		countArgs = append(countArgs, *storeID)
	}

	if criteria.OrderType == "BOPIS" {
		baseConditions += " AND o.order_type = 'PICKUP'"
	} else if criteria.OrderType == "STS" {
		baseConditions += " AND o.order_type = 'DELIVERY'"
	}

	if criteria.OrderID != nil {
		args = append(args, *criteria.OrderID)
		countArgs = append(countArgs, *criteria.OrderID)
		baseConditions += ` AND o.order_id = $` + fmt.Sprint(len(args))
	}

	if criteria.CustomerFirstName != "" {
		searchPattern := "%" + criteria.CustomerFirstName + "%"
		args = append(args, searchPattern)
		countArgs = append(countArgs, searchPattern)
		baseConditions += ` AND o.customer_name ILIKE $` + fmt.Sprint(len(args))
	}

	if criteria.CustomerLastName != "" {
		searchPattern := "%" + criteria.CustomerLastName + "%"
		args = append(args, searchPattern)
		countArgs = append(countArgs, searchPattern)
		baseConditions += ` AND o.customer_name ILIKE $` + fmt.Sprint(len(args))
	}

	if criteria.CustomerEmail != "" {
		searchPattern := "%" + criteria.CustomerEmail + "%"
		args = append(args, searchPattern)
		countArgs = append(countArgs, searchPattern)
		baseConditions += ` AND o.customer_email ILIKE $` + fmt.Sprint(len(args))
	}

	if criteria.BillingPhone != "" {
		searchPattern := "%" + criteria.BillingPhone + "%"
		args = append(args, searchPattern)
		countArgs = append(countArgs, searchPattern)
		baseConditions += ` AND o.billing_phone ILIKE $` + fmt.Sprint(len(args))
	}

	if criteria.PaymentCard != "" {
		args = append(args, criteria.PaymentCard)
		countArgs = append(countArgs, criteria.PaymentCard)
		baseConditions += ` AND o.payment_card_last4 = $` + fmt.Sprint(len(args))
	}

	if criteria.Status != "" {
		args = append(args, criteria.Status)
		countArgs = append(countArgs, criteria.Status)
		baseConditions += ` AND o.status = $` + fmt.Sprint(len(args))
	}

	if criteria.SKU != "" {
		searchPattern := "%" + criteria.SKU + "%"
		args = append(args, searchPattern)
		countArgs = append(countArgs, searchPattern)
		baseConditions += ` AND EXISTS (
			SELECT 1 FROM online_order_items ooi 
			JOIN products p ON ooi.product_id = p.product_id 
			WHERE ooi.order_id = o.order_id AND p.sku ILIKE $` + fmt.Sprint(len(args)) + `
		)`
	}

	countQuery = `
		SELECT COUNT(*) 
		FROM online_orders o
		WHERE ` + baseConditions

	query = `
		SELECT o.order_id, o.store_id, o.customer_email, o.customer_name, o.order_type, o.status, o.placed_at, o.fulfilled_at, o.subtotal, o.tax_amount, o.shipping_fee, o.total_amount, o.shipping_address 
		FROM online_orders o
		WHERE ` + baseConditions + ` 
		ORDER BY o.order_id DESC 
		LIMIT $` + fmt.Sprint(len(args)+1) + ` OFFSET $` + fmt.Sprint(len(args)+2)

	args = append(args, limit, offset)

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
		SELECT ooi.order_item_id, ooi.order_id, ooi.product_id, p.sku as product_sku, ooi.quantity, ooi.unit_price, ooi.picked_qty 
		FROM online_order_items ooi
		LEFT JOIN products p ON ooi.product_id = p.product_id
		WHERE ooi.order_id = $1
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
			&i.OrderItemId, &i.OrderId, &i.ProductId, &i.ProductSku, &i.Quantity, &i.UnitPrice, &i.PickedQty,
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
