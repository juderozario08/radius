//radius-backend/internal/models/merchandising.go
package models

import "time"

type Planogram struct {
	PlanogramId int        `json:"planogram_id"`
	StoreId     int        `json:"store_id"`
	Name        string     `json:"name"`
	Description *string    `json:"description"`
	Aisle       *string    `json:"aisle"`
	ValidFrom   time.Time  `json:"valid_from"`
	IsActive    bool       `json:"is_active"`
	CreatedBy   int        `json:"created_by"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   *time.Time `json:"updated_at"`
}

type PlanogramProduct struct {
	PlanogramItemId int `json:"planogram_item_id"`
	PlanogramId     int `json:"planogram_id"`
	StoreId         int `json:"store_id"`
	ProductId       int `json:"product_id"`
	Facings         int `json:"facings"`
}

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
	GeneratedBy  int              `json:"generated_by"`
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
}

type JobType string

const (
	JobTypePlanogram   JobType = "PLANOGRAM"
	JobTypePriceChange JobType = "PRICE CHANGE"
	JobTypeNewItem     JobType = "NEW ITEM"
	JobTypeClearance   JobType = "CLEARANCE"
)

type PriceTagJobStatus string

const (
	PriceTagJobStatusPending PriceTagJobStatus = "PENDING"
	PriceTagJobStatusPrinted PriceTagJobStatus = "PRINTED"
)

type PriceTagJob struct {
	TagJobId    int               `json:"tag_job_id"`
	StoreId     int               `json:"store_id"`
	JobType     JobType           `json:"job_type"`
	RequestedBy int               `json:"requested_by"`
	Status      PriceTagJobStatus `json:"status"`
	CreatedAt   time.Time         `json:"created_at"`
	PrintedAt   *time.Time        `json:"printed_at"`
}

type PriceTagJobItemsLabelTemplate string

const (
	PriceTagJobItemsShelfTagTemplate      PriceTagJobItemsLabelTemplate = "SHELF TAG"
	PriceTagJobItemsSmallBusinessTemplate PriceTagJobItemsLabelTemplate = "SMALL BUSINESS"
	PriceTagJobItemsBusinessTemplate      PriceTagJobItemsLabelTemplate = "BUSINESS"
	PriceTagJobItemsLargeTemplate         PriceTagJobItemsLabelTemplate = "LARGE"
	PriceTagJobItemsClearanceTemplate     PriceTagJobItemsLabelTemplate = "CLEARANCE"
)

type PriceTagJobItem struct {
	TagItemId     int                           `json:"tag_item_id"`
	TagJobId      int                           `json:"tag_job_id"`
	ProductId     int                           `json:"product_id"`
	LabelTemplate PriceTagJobItemsLabelTemplate `json:"label_template"`
	Price         float32                       `json:"price"`
	Printed       bool                          `json:"printed"`
}
