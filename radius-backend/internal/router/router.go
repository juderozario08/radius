package router

import (
	"net/http"
	"os"
	"radius/internal/handler"
	"radius/internal/middleware"
	"radius/internal/service"

	"github.com/gin-gonic/gin"
)

type Config struct {
	Handlers    Handlers
	JWTSecret   []byte
	AuthService *service.AuthService
}

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

func NewRouter(cfg Config) *gin.Engine {
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

	public := router.Group("/")
	{
		public.GET("/health", func(ctx *gin.Context) {
			ctx.JSON(http.StatusOK, gin.H{
				"status":  http.StatusOK,
				"message": "Server is working!",
			})
		})

		public.POST("/create_employee", cfg.Handlers.AuthHandler.Register)
		public.POST("/login", cfg.Handlers.AuthHandler.Login)
	}

	api := router.Group("/api")
	api.Use(middleware.RequireAuth(cfg.JWTSecret, cfg.AuthService))
	{
		api.POST("/logout", cfg.Handlers.AuthHandler.Logout)
	}

	return router
}
