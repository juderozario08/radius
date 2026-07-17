//radius-backend/internal/models/product.go
package models

import "time"

type Category struct {
	CategoryId int    `json:"category_id"`
	ParentId   *int   `json:"parent_id"`
	Name       string `json:"name"`
}

type Supplier struct {
	SupplierId   int     `json:"supplier_id"`
	Name         string  `json:"name"`
	ContactEmail string  `json:"contact_email"`
	Phone        *string `json:"phone"`
	LeadTimeDays int     `json:"lead_time_days"`
	IsActive     bool    `json:"is_active"`
}

type MeasureUnits string

const (
	MeasureEach MeasureUnits = "EACH"
	MeasureCase MeasureUnits = "CASE"
	MeasurePack MeasureUnits = "PACK"
)

type Product struct {
	ProductId     int          `json:"product_id"`
	Sku           string       `json:"sku"`
	Upc           string       `json:"upc"`
	Name          string       `json:"name"`
	Description   *string      `json:"description"`
	CategoryId    int          `json:"category_id"`
	Brand         string       `json:"brand"`
	UnitOfMeasure MeasureUnits `json:"unit_of_measure"`
	UnitsPerCase  int          `json:"units_per_case"`
	Weight        float32      `json:"weight"`
	IsActive      bool         `json:"is_active"`
	CreatedAt     time.Time    `json:"created_at"`
}

type ProductSupplier struct {
	ProductId   int     `json:"product_id"`
	SupplierId  int     `json:"supplier_id"`
	SupplierSku string  `json:"supplier_sku"`
	CostPrice   float64 `json:"cost_price"`
	IsPrimary   bool    `json:"is_primary"`
}
