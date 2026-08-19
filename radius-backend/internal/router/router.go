// radius-backend/internal/router/router.go
package router

import (
	"net/http"
	"radius/internal/config"
	"radius/internal/handler"
	"radius/internal/middleware"
	"radius/internal/models"
	"radius/internal/service"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type Config struct {
	Handlers    Handlers
	JWTSecret   []byte
	AuthService *service.AuthService
	AppConfig   *config.Config
}

type Handlers struct {
	AuditHandler       *handler.AuditHandler
	AuthHandler        *handler.AuthHandler
	EmployeeHandler    *handler.EmployeeHandler
	BarcodeHandler     *handler.BarcodeHandler
	CategoryHandler    *handler.CategoryHandler
	CycleCountHandler  *handler.CycleCountHandler
	FillReportHandler  *handler.FillReportHandler
	InventoryHandler   *handler.InventoryHandler
	OnlineOrderHandler *handler.OnlineOrderHandler
	OutOfStockHandler  *handler.OutOfStockHandler
	PlanogramHandler   *handler.PlanogramHandler
	PricingHandler     *handler.PricingHandler
	ProductHandler     *handler.ProductHandler
	ReceivingHandler   *handler.ReceivingHandler
	StoreHandler       *handler.StoreHandler
	TransactionHandler *handler.TransactionHandler
	TransferHandler    *handler.TransferHandler
	SessionHandler     *handler.SessionHandler
}

func NewRouter(cfg Config) *gin.Engine {
	switch cfg.AppConfig.GinMode {
	case "", "debug":
		gin.SetMode(gin.DebugMode)
	case "test":
		gin.SetMode(gin.TestMode)
	default:
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.Default()

	// Rate limiter: 5 requests per second, burst of 20
	limiter := middleware.NewIPRateLimiter(5, 20)
	router.Use(middleware.RateLimitMiddleware(limiter))

	var allowOrigins []string
	if cfg.AppConfig.GinMode == "release" {
		if allowed := cfg.AppConfig.AllowedOrigins; allowed != "" {
			allowOrigins = strings.Split(allowed, ",")
		}
	}

	corsConfig := cors.Config{
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
		MaxAge:           12 * time.Hour,
	}

	if len(allowOrigins) > 0 {
		corsConfig.AllowOrigins = allowOrigins
	} else {
		corsConfig.AllowAllOrigins = true
	}

	router.Use(cors.New(corsConfig))

	public := router.Group("/")
	{
		public.GET("/health", func(ctx *gin.Context) {
			ctx.JSON(http.StatusOK, models.APIMessage{
				Message: "Server is working!",
			})
		})

		public.POST("/login", cfg.Handlers.AuthHandler.Login)
		public.POST("/api/refresh_token", cfg.Handlers.AuthHandler.RefreshToken)
	}

	api := router.Group("/api")
	api.Use(middleware.RequireAuth(cfg.JWTSecret, cfg.AuthService))
	{
		api.POST("/logout", cfg.Handlers.AuthHandler.Logout)
		api.POST("/verify_token", cfg.Handlers.AuthHandler.VerifyToken)
	}

	admin := router.Group("/api/admin")
	admin.Use(middleware.RequireAuth(cfg.JWTSecret, cfg.AuthService), middleware.RequirePermission(middleware.PermViewAdminActions))
	{
		admin.GET("/health", func(ctx *gin.Context) {
			ctx.JSON(http.StatusOK, models.APIMessage{
				Message: "Admin route is working!",
			})
		})

		admin.POST("/create_employee", cfg.Handlers.EmployeeHandler.CreateEmployee)
		admin.GET("/get_all_employees", cfg.Handlers.EmployeeHandler.GetAllEmployees)
		admin.POST("/terminate_employee", cfg.Handlers.EmployeeHandler.TerminateEmployee)
		admin.POST("/activate_employee", cfg.Handlers.EmployeeHandler.ActivateEmployee)
		admin.PUT("/update_employee", cfg.Handlers.EmployeeHandler.UpdateEmployee)

		admin.GET("/get_all_sessions", cfg.Handlers.SessionHandler.GetAllSessions)
		admin.POST("/terminate_session", cfg.Handlers.SessionHandler.TerminateSession)

		admin.GET("/get_all_stores", cfg.Handlers.StoreHandler.GetAllStores)
		admin.PUT("/update_store", cfg.Handlers.StoreHandler.UpdateStore)
		admin.POST("/create_store", cfg.Handlers.StoreHandler.CreateStore)
		admin.POST("/activate_store", cfg.Handlers.StoreHandler.ActivateStore)
		admin.POST("/deactivate_store", cfg.Handlers.StoreHandler.DeactivateStore)
	}

	manager := router.Group("/api/manager")
	manager.Use(middleware.RequireAuth(cfg.JWTSecret, cfg.AuthService), middleware.RequirePermission(middleware.PermViewManagerActions))
	{
		manager.GET("/health", func(ctx *gin.Context) {
			ctx.JSON(http.StatusOK, models.APIMessage{
				Message: "Manager route is working!",
			})
		})

		manager.GET("/get_store", cfg.Handlers.StoreHandler.GetStore)
		manager.GET("/get_employees", cfg.Handlers.EmployeeHandler.GetManagerEmployees)
	}

	salesFloor := router.Group("/api/sales_floor")
	salesFloor.Use(middleware.RequireAuth(cfg.JWTSecret, cfg.AuthService), middleware.RequirePermission(middleware.PermViewSalesFloorAction))
	{
		salesFloor.GET("/get_all_transactions", cfg.Handlers.TransactionHandler.GetAllTransactions)
		salesFloor.GET("/get_transaction", cfg.Handlers.TransactionHandler.GetTransactionByID)
		salesFloor.GET("/get_product", cfg.Handlers.ProductHandler.GetProductByID)
		salesFloor.GET("/search_products", cfg.Handlers.ProductHandler.SearchProducts)

		salesFloor.GET("/get_all_categories", cfg.Handlers.CategoryHandler.GetAllCategories)
		salesFloor.GET("/get_distinct_brands", cfg.Handlers.CategoryHandler.GetDistinctBrands)

		salesFloor.GET("/get_all_online_orders", cfg.Handlers.OnlineOrderHandler.GetAllOnlineOrders)
		salesFloor.GET("/get_online_order", cfg.Handlers.OnlineOrderHandler.GetOnlineOrderByID)
		salesFloor.GET("/audit", cfg.Handlers.AuditHandler.GetProductAuditTrail)

		mims := salesFloor.Group("/inventory")
		{
			mims.GET("/product", cfg.Handlers.InventoryHandler.ScanProduct)
			mims.GET("/product-details", cfg.Handlers.InventoryHandler.GetProductScreenDetails)
			mims.GET("/location", cfg.Handlers.InventoryHandler.GetLocationProducts)
			mims.POST("/bin", cfg.Handlers.InventoryHandler.BinItem)
			mims.POST("/quantity", cfg.Handlers.InventoryHandler.UpdateQuantity)
			mims.PUT("/locations/sync", cfg.Handlers.InventoryHandler.SyncLocations)
			mims.POST("/location", cfg.Handlers.InventoryHandler.CreateMimsLocation)
			mims.POST("/adjust", cfg.Handlers.InventoryHandler.CreateAdjustment)
			mims.GET("/adjustments", cfg.Handlers.InventoryHandler.GetPendingAdjustments)
			mims.POST("/adjustments/review", cfg.Handlers.InventoryHandler.ReviewAdjustments)
		}

		is4tc := salesFloor.Group("/is4tc")
		{
			is4tc.GET("/session", cfg.Handlers.FillReportHandler.GetIS4TCSession)
			is4tc.POST("/session/add", cfg.Handlers.FillReportHandler.AddToIS4TCSession)
			is4tc.DELETE("/session/clear", cfg.Handlers.FillReportHandler.ClearIS4TCSession)
		}

		receiving := salesFloor.Group("/receiving")
		{
			receiving.GET("/purchase_orders", cfg.Handlers.ReceivingHandler.GetPurchaseOrders)
			receiving.GET("/purchase_order", cfg.Handlers.ReceivingHandler.GetPurchaseOrderDetail)
			receiving.GET("/check_product", cfg.Handlers.ReceivingHandler.CheckProductInPO)
			receiving.POST("/receive_po", cfg.Handlers.ReceivingHandler.ReceivePO)
			receiving.POST("/receive_lpr", cfg.Handlers.ReceivingHandler.ReceiveLPR)
			receiving.GET("/transfers", cfg.Handlers.ReceivingHandler.GetStockTransfers)
			receiving.GET("/transfer", cfg.Handlers.ReceivingHandler.GetStockTransferDetail)
			receiving.GET("/check_transfer_product", cfg.Handlers.ReceivingHandler.CheckProductInTransfer)
			receiving.POST("/receive_transfer", cfg.Handlers.ReceivingHandler.ReceiveTransfer)
			receiving.POST("/quick_receive_transfer", cfg.Handlers.ReceivingHandler.QuickReceiveTransfer)
		}
	}

	return router
}
