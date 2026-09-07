// radius-backend/internal/repository/orders_repo.go
package repository

import (
	"context"
	"database/sql"
	"fmt"
	"radius/internal/models"
	"time"
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

func (r *OrdersRepo) CreateOnlineOrder(ctx context.Context, order *models.OnlineOrder) (*models.OnlineOrder, error) {
	if order == nil {
		return nil, fmt.Errorf("order cannot be nil")
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	placedAt := order.PlacedAt
	if placedAt.IsZero() {
		placedAt = time.Now().UTC()
	}

	insertOrderQuery := `
		INSERT INTO online_orders (
			store_id, customer_email, customer_name, order_type, status,
			subtotal, tax_amount, shipping_fee, total_amount, shipping_address,
			placed_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING order_id, placed_at
	`

	err = tx.QueryRowContext(
		ctx,
		insertOrderQuery,
		order.StoreId,
		order.CustomerEmail,
		order.CustomerName,
		order.OrderType,
		order.Status,
		order.Subtotal,
		order.TaxAmount,
		order.ShippingFee,
		order.TotalAmount,
		order.ShippingAddress,
		placedAt,
	).Scan(&order.OrderId, &order.PlacedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to insert online order header: %w", err)
	}

	if len(order.Items) > 0 {
		insertItemQuery := `
			INSERT INTO online_order_items (
				order_id, product_id, quantity, unit_price, picked_qty, total_price
			)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING order_item_id
		`

		for i := range order.Items {
			item := &order.Items[i]
			item.OrderId = order.OrderId

			pickedQty := 0
			if item.PickedQty != nil {
				pickedQty = *item.PickedQty
			}
			totalPrice := float32(item.Quantity) * item.UnitPrice

			var productID any
			if item.ProductId > 0 {
				productID = item.ProductId
			}

			err = tx.QueryRowContext(
				ctx,
				insertItemQuery,
				order.OrderId,
				productID,
				item.Quantity,
				item.UnitPrice,
				pickedQty,
				totalPrice,
			).Scan(&item.OrderItemId)
			if err != nil {
				return nil, fmt.Errorf("failed to insert online order item at index %d: %w", i, err)
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return order, nil
}

func (r *OrdersRepo) GetAllPrintOrders(ctx context.Context, limit, offset int, storeID *int, criteria models.PrintOrderSearchCriteria) ([]models.PrintOrder, int, error) {
	var countQuery string
	var query string
	var args []any
	var countArgs []any

	baseConditions := "TRUE"

	addArg := func(val any) string {
		args = append(args, val)
		countArgs = append(countArgs, val)
		return fmt.Sprintf("$%d", len(args))
	}

	if storeID != nil {
		baseConditions += fmt.Sprintf(" AND po.store_id = %s", addArg(*storeID))
	}

	if criteria.OrderType != "" {
		baseConditions += fmt.Sprintf(" AND po.order_type = %s", addArg(criteria.OrderType))
	}

	if criteria.OrderID != nil {
		baseConditions += fmt.Sprintf(" AND po.print_order_id = %s", addArg(*criteria.OrderID))
	}

	if criteria.CustomerName != "" {
		baseConditions += fmt.Sprintf(" AND po.customer_name ILIKE %s", addArg("%"+criteria.CustomerName+"%"))
	}

	if criteria.CustomerEmail != "" {
		baseConditions += fmt.Sprintf(" AND po.customer_email ILIKE %s", addArg("%"+criteria.CustomerEmail+"%"))
	}

	if criteria.CustomerPhone != "" {
		baseConditions += fmt.Sprintf(" AND po.customer_phone ILIKE %s", addArg("%"+criteria.CustomerPhone+"%"))
	}

	if criteria.Status != "" {
		baseConditions += fmt.Sprintf(" AND po.status = %s", addArg(criteria.Status))
	}

	countQuery = `
		SELECT COUNT(*)
		FROM print_orders po
		WHERE ` + baseConditions

	limitPlaceholder := fmt.Sprintf("$%d", len(args)+1)
	offsetPlaceholder := fmt.Sprintf("$%d", len(args)+2)
	args = append(args, limit, offset)

	query = `
		SELECT 
			po.print_order_id, 
			po.store_id, 
			po.customer_name, 
			COALESCE(po.customer_email, ''), 
			COALESCE(po.customer_phone, ''), 
			po.order_type, 
			po.status, 
			po.subtotal, 
			po.tax_amount, 
			po.shipping_fee, 
			po.total_amount, 
			COALESCE(po.shipping_address, ''), 
			COALESCE(po.notes, ''), 
			po.placed_at, 
			po.fulfilled_at
		FROM print_orders po
		WHERE ` + baseConditions + fmt.Sprintf(`
		ORDER BY po.print_order_id DESC
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

	var orders []models.PrintOrder
	for rows.Next() {
		var o models.PrintOrder
		if err := rows.Scan(
			&o.PrintOrderId, &o.StoreId, &o.CustomerName, &o.CustomerEmail, &o.CustomerPhone,
			&o.OrderType, &o.Status, &o.Subtotal, &o.TaxAmount, &o.ShippingFee,
			&o.TotalAmount, &o.ShippingAddress, &o.Notes, &o.PlacedAt, &o.FulfilledAt,
		); err != nil {
			return nil, 0, err
		}
		orders = append(orders, o)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	if orders == nil {
		orders = []models.PrintOrder{}
	}

	return orders, total, nil
}

func (r *OrdersRepo) GetPrintOrderByID(ctx context.Context, id int, storeID *int) (*models.PrintOrder, []models.PrintOrderItem, error) {
	var query string
	var args []any

	if storeID != nil {
		query = `
			SELECT 
				print_order_id, store_id, customer_name, COALESCE(customer_email, ''), COALESCE(customer_phone, ''),
				order_type, status, subtotal, tax_amount, shipping_fee, total_amount, COALESCE(shipping_address, ''),
				COALESCE(notes, ''), placed_at, fulfilled_at
			FROM print_orders
			WHERE print_order_id = $1 AND store_id = $2
		`
		args = []any{id, *storeID}
	} else {
		query = `
			SELECT 
				print_order_id, store_id, customer_name, COALESCE(customer_email, ''), COALESCE(customer_phone, ''),
				order_type, status, subtotal, tax_amount, shipping_fee, total_amount, COALESCE(shipping_address, ''),
				COALESCE(notes, ''), placed_at, fulfilled_at
			FROM print_orders
			WHERE print_order_id = $1
		`
		args = []any{id}
	}

	var o models.PrintOrder
	err := r.db.QueryRowContext(ctx, query, args...).Scan(
		&o.PrintOrderId, &o.StoreId, &o.CustomerName, &o.CustomerEmail, &o.CustomerPhone,
		&o.OrderType, &o.Status, &o.Subtotal, &o.TaxAmount, &o.ShippingFee,
		&o.TotalAmount, &o.ShippingAddress, &o.Notes, &o.PlacedAt, &o.FulfilledAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil, nil
		}
		return nil, nil, err
	}

	itemQuery := `
		SELECT print_order_item_id, print_order_id, service_id, description, quantity, unit_price
		FROM print_order_items
		WHERE print_order_id = $1
		ORDER BY print_order_item_id ASC
	`
	rows, err := r.db.QueryContext(ctx, itemQuery, id)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	var items []models.PrintOrderItem
	for rows.Next() {
		var i models.PrintOrderItem
		if err := rows.Scan(
			&i.PrintOrderItemId, &i.PrintOrderId, &i.ServiceId, &i.Description, &i.Quantity, &i.UnitPrice,
		); err != nil {
			return nil, nil, err
		}
		items = append(items, i)
	}

	if err := rows.Err(); err != nil {
		return nil, nil, err
	}

	if items == nil {
		items = []models.PrintOrderItem{}
	}

	return &o, items, nil
}
