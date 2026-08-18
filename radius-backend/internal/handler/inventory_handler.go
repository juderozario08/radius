//radius-backend/internal/handler/inventory_handler.go
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
	email := ctx.GetString("email")

	barcode := ctx.Query("barcode")
	if barcode == "" {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Barcode is required"})
		return
	}

	result, err := h.inventoryService.ScanProduct(ctx.Request.Context(), email, barcode)
	if err != nil {
		log.Printf("[ERROR] InventoryHandler.ScanProduct (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, result)
}

func (h *InventoryHandler) GetLocationProducts(ctx *gin.Context) {
	email := ctx.GetString("email")

	locationID := ctx.Query("location_id")
	if locationID == "" {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Location ID is required"})
		return
	}

	result, err := h.inventoryService.GetLocationProducts(ctx.Request.Context(), email, locationID)
	if err != nil {
		log.Printf("[ERROR] InventoryHandler.GetLocationProducts (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, result)
}

func (h *InventoryHandler) BinItem(ctx *gin.Context) {
	email := ctx.GetString("email")

	var req models.BinItemRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	result, err := h.inventoryService.BinItem(ctx.Request.Context(), email, req)
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
	email := ctx.GetString("email")

	var req models.UpdateQuantityRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	err := h.inventoryService.UpdateQuantity(ctx.Request.Context(), email, req)
	if err != nil {
		log.Printf("[ERROR] InventoryHandler.UpdateQuantity: %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Quantity updated successfully"})
}

func (h *InventoryHandler) GetProductScreenDetails(ctx *gin.Context) {
	email := ctx.GetString("email")

	productIDStr := ctx.Query("product_id")
	if productIDStr == "" {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "product_id is required"})
		return
	}

	productID, err := strconv.Atoi(productIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid product_id"})
		return
	}

	result, err := h.inventoryService.GetProductScreenDetails(ctx.Request.Context(), email, productID)
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
	email := ctx.GetString("email")

	var req models.SyncLocationsRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	err := h.inventoryService.SyncLocations(ctx.Request.Context(), email, req)
	if err != nil {
		log.Printf("[ERROR] InventoryHandler.SyncLocations: %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Locations synced successfully"})
}
