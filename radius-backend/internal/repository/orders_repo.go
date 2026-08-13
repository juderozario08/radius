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

	baseConditions := "TRUE"

	// Helper to safely append arguments and return the $N placeholder
	addArg := func(val any) string {
		args = append(args, val)
		countArgs = append(countArgs, val)
		return fmt.Sprintf("$%d", len(args))
	}

	if storeID != nil {
		baseConditions += fmt.Sprintf(" AND o.store_id = %s", addArg(*storeID))
	}

	switch criteria.OrderType {
	case "BOPIS":
		baseConditions += ` AND o.order_type = 'BOPIS'`
	case "STS":
		baseConditions += ` AND o.order_type = 'STS'`
	}

	if criteria.OrderID != nil {
		baseConditions += fmt.Sprintf(" AND o.order_id = %s", addArg(*criteria.OrderID))
	}

	if criteria.CustomerFirstName != "" {
		baseConditions += fmt.Sprintf(" AND o.customer_name ILIKE %s", addArg("%"+criteria.CustomerFirstName+"%"))
	}

	if criteria.CustomerLastName != "" {
		baseConditions += fmt.Sprintf(" AND o.customer_name ILIKE %s", addArg("%"+criteria.CustomerLastName+"%"))
	}

	if criteria.CustomerEmail != "" {
		baseConditions += fmt.Sprintf(" AND o.customer_email ILIKE %s", addArg("%"+criteria.CustomerEmail+"%"))
	}

	if criteria.BillingPhone != "" {
		baseConditions += fmt.Sprintf(" AND o.billing_phone ILIKE %s", addArg("%"+criteria.BillingPhone+"%"))
	}

	if criteria.PaymentCard != "" {
		baseConditions += fmt.Sprintf(" AND o.payment_card_last4 = %s", addArg(criteria.PaymentCard))
	}

	if criteria.Status != "" {
		baseConditions += fmt.Sprintf(" AND o.status = %s", addArg(criteria.Status))
	}

	if criteria.SKU != "" {
		baseConditions += fmt.Sprintf(` AND EXISTS (
			SELECT 1 FROM online_order_items ooi
			JOIN products p ON ooi.product_id = p.product_id
			WHERE ooi.order_id = o.order_id AND p.sku ILIKE %s
		)`, addArg("%"+criteria.SKU+"%"))
	}

	countQuery = `
		SELECT COUNT(*)
		FROM online_orders o
		WHERE ` + baseConditions

	limitPlaceholder := fmt.Sprintf("$%d", len(args)+1)
	offsetPlaceholder := fmt.Sprintf("$%d", len(args)+2)
	args = append(args, limit, offset)

	query = `
		SELECT o.order_id, o.store_id, o.customer_email, o.customer_name, o.order_type, o.status, o.placed_at, o.fulfilled_at, o.subtotal, o.tax_amount, o.shipping_fee, o.total_amount, o.shipping_address
		FROM online_orders o
		WHERE ` + baseConditions + fmt.Sprintf(`
		ORDER BY o.order_id DESC
		LIMIT %s OFFSET %s`, limitPlaceholder, offsetPlaceholder)

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
