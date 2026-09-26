package handler

import (
	"log"
	"net/http"
	"radius/internal/models"
	"radius/internal/service"
	"strconv"

	"github.com/gin-gonic/gin"
)

type InventoryHandler struct {
	inventoryService *service.InventoryService
}

func NewInventoryHandler(inventoryService *service.InventoryService) *InventoryHandler {
	return &InventoryHandler{
		inventoryService: inventoryService,
	}
}

func (h *InventoryHandler) ScanProduct(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	employeeId := ctx.GetInt("employee_id")

	barcode := ctx.Query("barcode")
	if barcode == "" {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Barcode is required"})
		return
	}

	result, err := h.inventoryService.ScanProduct(ctx.Request.Context(), storeId, employeeId, barcode)
	if err != nil {
		log.Printf("[ERROR] InventoryHandler.ScanProduct (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, result)
}

func (h *InventoryHandler) GetLocationProducts(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	employeeId := ctx.GetInt("employee_id")

	locationID := ctx.Param("id")
	if locationID == "" {
		locationID = ctx.Query("location_id")
	}
	if locationID == "" {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Location ID is required"})
		return
	}

	result, err := h.inventoryService.GetLocationProducts(ctx.Request.Context(), storeId, employeeId, locationID)
	if err != nil {
		log.Printf("[ERROR] InventoryHandler.GetLocationProducts (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, result)
}

func (h *InventoryHandler) BinItem(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	employeeId := ctx.GetInt("employee_id")

	var req models.BinItemRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	result, err := h.inventoryService.BinItem(ctx.Request.Context(), storeId, employeeId, req)
	if err != nil {
		log.Printf("[ERROR] InventoryHandler.BinItem: %v", err)
		if err.Error() == "Product is not in this bin" {
			ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
			return
		}
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, result)
}

func (h *InventoryHandler) UpdateQuantity(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")

	var req models.UpdateQuantityRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	err := h.inventoryService.UpdateQuantity(ctx.Request.Context(), storeId, req)
	if err != nil {
		log.Printf("[ERROR] InventoryHandler.UpdateQuantity: %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Quantity updated successfully"})
}

func (h *InventoryHandler) GetProductScreenDetails(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")

	productIDStr := ctx.Param("id")
	if productIDStr == "" {
		productIDStr = ctx.Query("product_id")
	}
	if productIDStr == "" {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "product_id is required"})
		return
	}

	productID, err := strconv.Atoi(productIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid product_id"})
		return
	}

	result, err := h.inventoryService.GetProductScreenDetails(ctx.Request.Context(), storeId, productID)
	if err != nil {
		log.Printf("[ERROR] InventoryHandler.GetProductScreenDetails: %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	if result == nil {
		ctx.JSON(http.StatusNotFound, models.APIError{Error: "Product not found"})
		return
	}

	ctx.JSON(http.StatusOK, result)
}

func (h *InventoryHandler) SyncLocations(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")

	var req models.SyncLocationsRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	err := h.inventoryService.SyncLocations(ctx.Request.Context(), storeId, req)
	if err != nil {
		log.Printf("[ERROR] InventoryHandler.SyncLocations: %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Locations synced successfully"})
}

func (h *InventoryHandler) CreateMimsLocation(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")

	var req models.CreateMimsLocationRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	err := h.inventoryService.CreateMimsLocation(ctx.Request.Context(), storeId, req)
	if err != nil {
		log.Printf("[ERROR] InventoryHandler.CreateMimsLocation: %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Location created successfully"})
}

func (h *InventoryHandler) CreateAdjustment(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	employeeId := ctx.GetInt("employee_id")

	var req models.AdjustInventoryRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	err := h.inventoryService.CreateInventoryAdjustment(ctx.Request.Context(), storeId, employeeId, req)
	if err != nil {
		log.Printf("[ERROR] InventoryHandler.CreateAdjustment: %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Adjustment submitted for review"})
}

func (h *InventoryHandler) GetPendingAdjustments(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")

	adjustments, err := h.inventoryService.GetPendingAdjustments(ctx.Request.Context(), storeId)
	if err != nil {
		log.Printf("[ERROR] InventoryHandler.GetPendingAdjustments: %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, adjustments)
}

func (h *InventoryHandler) ReviewAdjustments(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	employeeId := ctx.GetInt("employee_id")
	role := models.EmployeeRole(ctx.GetString("role"))

	var req models.ReviewAdjustmentRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	err := h.inventoryService.ReviewAdjustments(ctx.Request.Context(), storeId, employeeId, role, req)
	if err != nil {
		log.Printf("[ERROR] InventoryHandler.ReviewAdjustments: %v", err)
		if err.Error() == "unauthorized" {
			ctx.JSON(http.StatusForbidden, models.APIError{Error: "unauthorized"})
		} else {
			ctx.JSON(http.StatusInternalServerError, models.APIError{Error: err.Error()})
		}
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Adjustments reviewed successfully"})
}
