package router

import (
	"net/http"
	"os"
	"radius/internal/handler"
	"radius/internal/middleware"

	"github.com/gin-gonic/gin"
)

type Handlers struct {
	AuthHandler        *handler.AuthHandler
	BarcodeHandler     *handler.BarcodeHandler
	CycleCountHandler  *handler.CycleCountHandler
	FillReportHandler  *handler.FillReportHandler
	InventoryHandler   *handler.InventoryHandler
	OnlineOrderHandler *handler.OnlineOrderHandler
	OutOfStockHandler  *handler.OutOfStockHandler
	PlanogramHandler   *handler.PlanogramHandler
	POSHandler         *handler.POSHandler
	PricingHandler     *handler.PricingHandler
	ProductHandler     *handler.ProductHandler
	StoreHandler       *handler.StoreHandler
	TransactionHandler *handler.TransactionHandler
	TransferHandler    *handler.TransactionHandler
}

func New(h Handlers) *gin.Engine {
	ginMode := os.Getenv("GIN_MODE")
	switch ginMode {
	case "", "debug":
		gin.SetMode(gin.DebugMode)
	case "test":
		gin.SetMode(gin.TestMode)
	default:
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.Default()

	router.GET("/health", func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{
			"status":  http.StatusOK,
			"message": "Server is working!",
		})
	})

	router.POST("/register", h.AuthHandler.Register)
	router.POST("/login", h.AuthHandler.Login)

	api := router.Group("/api")
	api.Use(middleware.RequireAuth())
	{
		api.POST("/logout", h.AuthHandler.Logout)
	}

	return router
}
