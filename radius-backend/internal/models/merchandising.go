package models

import "time"

type FillReportStatus string

const (
	FillReportStatusOpen       FillReportStatus = "OPEN"
	FillReportStatusInProgress FillReportStatus = "IN_PROGRESS"
	FillReportStatusCompleted  FillReportStatus = "COMPLETED"
)

type FillReport struct {
	FillReportId int              `json:"fill_report_id"`
	StoreId      int              `json:"store_id"`
	ReportDate   time.Time        `json:"report_date"`
	GeneratedBy  *int             `json:"generated_by"`
	Status       FillReportStatus `json:"status"`
	CreatedAt    time.Time        `json:"created_at"`
}

type FillReportItem struct {
	FillItemId   int        `json:"fill_item_id"`
	FillReportId int        `json:"fill_report_id"`
	ProductId    int        `json:"product_id"`
	FillQty      int        `json:"fill_qty"`
	Completed    bool       `json:"completed"`
	CompletedAt  *time.Time `json:"completed_at"`
	IsEmptyHole  bool       `json:"is_empty_hole"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    *time.Time `json:"updated_at"`
}

type FillReportItemDetail struct {
	FillItemId     int        `json:"fill_item_id"`
	FillReportId   int        `json:"fill_report_id"`
	ProductId      int        `json:"product_id"`
	ProductName    string     `json:"product_name"`
	ProductSku     string     `json:"product_sku"`
	ProductUpc     string     `json:"product_upc"`
	Brand          string     `json:"brand"`
	CategoryId     *int       `json:"category_id"`
	CategoryName   *string    `json:"category_name"`
	Aisle          *string    `json:"aisle"`
	MimsLocationId *string    `json:"mims_location_id"`
	OnHandQty      int        `json:"on_hand_qty"`
	AvailableQty   int        `json:"available_qty"`
	FillQty        int        `json:"fill_qty"`
	Completed      bool       `json:"completed"`
	CompletedAt    *time.Time `json:"completed_at"`
	IsEmptyHole    bool       `json:"is_empty_hole"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      *time.Time `json:"updated_at"`
}

type FillReportFilter struct {
	Query      string `form:"query"`
	FilterType string `form:"filter_type"`
	SortBy     string `form:"sort_by"`
	SortOrder  string `form:"sort_order"`
}

type FillReportResponse struct {
	FillReport FillReport             `json:"fill_report"`
	Items      []FillReportItemDetail `json:"items"`
	TotalItems int                    `json:"total_items"`
	FillQtySum int                    `json:"fill_qty_sum"`
	Is4tcCount int                    `json:"is4tc_count"`
}

type ScanEmptyHoleRequest struct {
	ProductID int `json:"product_id" binding:"required"`
}
