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
	PricingHandler     *handler.PricingHandler
	ProductHandler     *handler.ProductHandler
	ReceivingHandler   *handler.ReceivingHandler
	StoreHandler       *handler.StoreHandler
	TransactionHandler *handler.TransactionHandler
	TransferHandler    *handler.TransferHandler
	SessionHandler     *handler.SessionHandler
	PrintOrderHandler  *handler.PrintOrderHandler
	WSHandler          *handler.WSHandler
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

	if cfg.Handlers.WSHandler != nil {
		router.GET("/api/v1/ws", cfg.Handlers.WSHandler.HandleWebSocket)
		router.GET("/ws", cfg.Handlers.WSHandler.HandleWebSocket)
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
		employees := admin.Group("/employees")
		{
			employees.POST("", cfg.Handlers.EmployeeHandler.CreateEmployee)
			employees.POST("/create", cfg.Handlers.EmployeeHandler.CreateEmployee)
			employees.GET("", cfg.Handlers.EmployeeHandler.GetAllEmployees)
			employees.POST("/:id/terminate", cfg.Handlers.EmployeeHandler.TerminateEmployee)
			employees.POST("/terminate", cfg.Handlers.EmployeeHandler.TerminateEmployee)
			employees.POST("/:id/activate", cfg.Handlers.EmployeeHandler.ActivateEmployee)
			employees.POST("/activate", cfg.Handlers.EmployeeHandler.ActivateEmployee)
			employees.PUT("/:id", cfg.Handlers.EmployeeHandler.UpdateEmployee)
			employees.PUT("/update", cfg.Handlers.EmployeeHandler.UpdateEmployee)
		}

		sessions := admin.Group("/sessions")
		{
			sessions.GET("", cfg.Handlers.SessionHandler.GetAllSessions)
			sessions.DELETE("/:id", cfg.Handlers.SessionHandler.TerminateSession)
			sessions.POST("/terminate", cfg.Handlers.SessionHandler.TerminateSession)
		}

		stores := admin.Group("/stores")
		{
			stores.GET("", cfg.Handlers.StoreHandler.GetAllStores)
			stores.GET("/operations", cfg.Handlers.StoreHandler.GetStoreOperations)
			stores.GET("/:id", cfg.Handlers.StoreHandler.GetStore)
			stores.POST("", cfg.Handlers.StoreHandler.CreateStore)
			stores.POST("/create", cfg.Handlers.StoreHandler.CreateStore)
			stores.PUT("/:id", cfg.Handlers.StoreHandler.UpdateStore)
			stores.PUT("/update", cfg.Handlers.StoreHandler.UpdateStore)
			stores.POST("/create", cfg.Handlers.StoreHandler.CreateStore)
			stores.POST("/:id/activate", cfg.Handlers.StoreHandler.ActivateStore)
			stores.POST("/activate", cfg.Handlers.StoreHandler.ActivateStore)
			stores.POST("/:id/deactivate", cfg.Handlers.StoreHandler.DeactivateStore)
			stores.POST("/deactivate", cfg.Handlers.StoreHandler.DeactivateStore)
		}
	}

	manager := router.Group("/api/manager")
	manager.Use(middleware.RequireAuth(cfg.JWTSecret, cfg.AuthService), middleware.RequirePermission(middleware.PermViewManagerActions))
	{
		store := manager.Group("/store")
		{
			store.GET("", cfg.Handlers.StoreHandler.GetStore)
			store.GET("/:id", cfg.Handlers.StoreHandler.GetStore)
		}

		employees := manager.Group("/employees")
		{
			employees.GET("", cfg.Handlers.EmployeeHandler.GetManagerEmployees)
		}
	}

	salesFloor := router.Group("/api/sales_floor")
	salesFloor.Use(middleware.RequireAuth(cfg.JWTSecret, cfg.AuthService), middleware.RequirePermission(middleware.PermViewSalesFloorAction))
	{
		products := salesFloor.Group("/products")
		{
			products.GET("/:id", cfg.Handlers.ProductHandler.GetProductByID)
			products.GET("/get", cfg.Handlers.ProductHandler.GetProductByID)
			products.GET("/search", cfg.Handlers.ProductHandler.SearchProducts)
			products.GET("/categories", cfg.Handlers.CategoryHandler.GetAllCategories)
			products.GET("/brands", cfg.Handlers.CategoryHandler.GetDistinctBrands)
			products.GET("/audit", cfg.Handlers.AuditHandler.GetProductAuditTrail)
		}

		transactions := salesFloor.Group("/transactions")
		{
			transactions.GET("", cfg.Handlers.TransactionHandler.GetAllTransactions)
			transactions.GET("/:id", cfg.Handlers.TransactionHandler.GetTransactionByID)
			transactions.GET("/get", cfg.Handlers.TransactionHandler.GetTransactionByID)
			transactions.POST("", cfg.Handlers.TransactionHandler.CreateTransaction)
			transactions.POST("/create", cfg.Handlers.TransactionHandler.CreateTransaction)
		}

		orders := salesFloor.Group("/orders")
		{
			orders.GET("/online", cfg.Handlers.OnlineOrderHandler.GetAllOnlineOrders)
			orders.GET("/online/:id", cfg.Handlers.OnlineOrderHandler.GetOnlineOrderByID)
			orders.GET("/online/get", cfg.Handlers.OnlineOrderHandler.GetOnlineOrderByID)
			orders.POST("/online", cfg.Handlers.OnlineOrderHandler.CreateOnlineOrder)
			orders.PUT("/online/:id/assign", cfg.Handlers.OnlineOrderHandler.AssignOnlineOrder)
			orders.PUT("/online/assign", cfg.Handlers.OnlineOrderHandler.AssignOnlineOrder)
			orders.PUT("/online/:id/items", cfg.Handlers.OnlineOrderHandler.UpdateOnlineOrderItem)
			orders.PUT("/online/:id/items/:item_id", cfg.Handlers.OnlineOrderHandler.UpdateOnlineOrderItem)
			orders.PUT("/online/items", cfg.Handlers.OnlineOrderHandler.UpdateOnlineOrderItem)
			orders.POST("/online/:id/complete_pick", cfg.Handlers.OnlineOrderHandler.CompleteOrderPicking)
			orders.POST("/online/complete_pick", cfg.Handlers.OnlineOrderHandler.CompleteOrderPicking)
			orders.POST("/online/:id/cancel", cfg.Handlers.OnlineOrderHandler.CancelOnlineOrder)
			orders.POST("/online/cancel", cfg.Handlers.OnlineOrderHandler.CancelOnlineOrder)
			orders.GET("/print", cfg.Handlers.PrintOrderHandler.GetAllPrintOrders)
			orders.GET("/print/:id", cfg.Handlers.PrintOrderHandler.GetPrintOrderByID)
			orders.GET("/print/get", cfg.Handlers.PrintOrderHandler.GetPrintOrderByID)
		}

		mims := salesFloor.Group("/inventory")
		{
			mims.GET("/product", cfg.Handlers.InventoryHandler.ScanProduct)
			mims.GET("/products/:id", cfg.Handlers.InventoryHandler.GetProductScreenDetails)
			mims.GET("/product-details", cfg.Handlers.InventoryHandler.GetProductScreenDetails)
			mims.GET("/locations/:id", cfg.Handlers.InventoryHandler.GetLocationProducts)
			mims.GET("/location", cfg.Handlers.InventoryHandler.GetLocationProducts)
			mims.POST("/bin", cfg.Handlers.InventoryHandler.BinItem)
			mims.POST("/quantity", cfg.Handlers.InventoryHandler.UpdateQuantity)
			mims.PUT("/locations/sync", cfg.Handlers.InventoryHandler.SyncLocations)
			mims.POST("/location", cfg.Handlers.InventoryHandler.CreateMimsLocation)
			mims.POST("/locations", cfg.Handlers.InventoryHandler.CreateMimsLocation)
			mims.POST("/adjust", cfg.Handlers.InventoryHandler.CreateAdjustment)
			mims.POST("/adjustments", cfg.Handlers.InventoryHandler.CreateAdjustment)
			mims.GET("/adjustments", cfg.Handlers.InventoryHandler.GetPendingAdjustments)
			mims.POST("/adjustments/review", cfg.Handlers.InventoryHandler.ReviewAdjustments)
		}

		is4tc := salesFloor.Group("/is4tc")
		{
			is4tc.GET("/session", cfg.Handlers.FillReportHandler.GetIS4TCSession)
			is4tc.POST("/session/add", cfg.Handlers.FillReportHandler.AddToIS4TCSession)
			is4tc.DELETE("/session/clear", cfg.Handlers.FillReportHandler.ClearIS4TCSession)
		}

		fillReports := salesFloor.Group("/fill_reports")
		{
			fillReports.GET("", cfg.Handlers.FillReportHandler.GetFillReport)
			fillReports.POST("/empty_hole", cfg.Handlers.FillReportHandler.ScanEmptyHole)
		}

		receiving := salesFloor.Group("/receiving")
		{
			receiving.GET("/purchase_orders", cfg.Handlers.ReceivingHandler.GetPurchaseOrders)
			receiving.GET("/purchase_orders/:id", cfg.Handlers.ReceivingHandler.GetPurchaseOrderDetail)
			receiving.GET("/purchase_order", cfg.Handlers.ReceivingHandler.GetPurchaseOrderDetail)
			receiving.GET("/purchase_orders/:id/check_product", cfg.Handlers.ReceivingHandler.CheckProductInPO)
			receiving.GET("/check_product", cfg.Handlers.ReceivingHandler.CheckProductInPO)
			receiving.POST("/purchase_orders/:id/receive", cfg.Handlers.ReceivingHandler.ReceivePO)
			receiving.POST("/receive_po", cfg.Handlers.ReceivingHandler.ReceivePO)
			receiving.POST("/purchase_orders/:id/receive_lpr", cfg.Handlers.ReceivingHandler.ReceiveLPR)
			receiving.POST("/receive_lpr", cfg.Handlers.ReceivingHandler.ReceiveLPR)
			receiving.GET("/transfers", cfg.Handlers.ReceivingHandler.GetStockTransfers)
			receiving.GET("/transfers/:id", cfg.Handlers.ReceivingHandler.GetStockTransferDetail)
			receiving.GET("/transfer", cfg.Handlers.ReceivingHandler.GetStockTransferDetail)
			receiving.GET("/transfers/:id/check_product", cfg.Handlers.ReceivingHandler.CheckProductInTransfer)
			receiving.GET("/check_transfer_product", cfg.Handlers.ReceivingHandler.CheckProductInTransfer)
			receiving.POST("/transfers/:id/receive", cfg.Handlers.ReceivingHandler.ReceiveTransfer)
			receiving.POST("/receive_transfer", cfg.Handlers.ReceivingHandler.ReceiveTransfer)
			receiving.POST("/transfers/:id/quick_receive", cfg.Handlers.ReceivingHandler.QuickReceiveTransfer)
			receiving.POST("/quick_receive_transfer", cfg.Handlers.ReceivingHandler.QuickReceiveTransfer)
		}

		transfers := salesFloor.Group("/transfers")
		{
			transfers.GET("", cfg.Handlers.TransferHandler.GetOutboundTransfers)
			transfers.GET("/:id", cfg.Handlers.TransferHandler.GetOutboundTransferDetail)
			transfers.GET("/detail", cfg.Handlers.TransferHandler.GetOutboundTransferDetail)
			transfers.POST("", cfg.Handlers.TransferHandler.CreateTransfer)
			transfers.POST("/create", cfg.Handlers.TransferHandler.CreateTransfer)
			transfers.POST("/:id/dispatch", cfg.Handlers.TransferHandler.DispatchTransfer)
			transfers.POST("/dispatch", cfg.Handlers.TransferHandler.DispatchTransfer)
			transfers.POST("/:id/cancel", cfg.Handlers.TransferHandler.CancelTransfer)
			transfers.POST("/cancel", cfg.Handlers.TransferHandler.CancelTransfer)
			transfers.GET("/stores", cfg.Handlers.TransferHandler.GetDestinationStores)
		}

		cycleCounts := salesFloor.Group("/cycle_counts")
		{
			cycleCounts.GET("", cfg.Handlers.CycleCountHandler.GetWeeklyCycleCounts)
			cycleCounts.GET("/:id", cfg.Handlers.CycleCountHandler.GetCycleCountDetail)
			cycleCounts.GET("/detail", cfg.Handlers.CycleCountHandler.GetCycleCountDetail)
			cycleCounts.GET("/:id/items", cfg.Handlers.CycleCountHandler.GetCycleCountItems)
			cycleCounts.GET("/items", cfg.Handlers.CycleCountHandler.GetCycleCountItems)
			cycleCounts.POST("", cfg.Handlers.CycleCountHandler.StartCycleCount)
			cycleCounts.POST("/start", cfg.Handlers.CycleCountHandler.StartCycleCount)
			cycleCounts.POST("/:id/scans", cfg.Handlers.CycleCountHandler.RecordScan)
			cycleCounts.POST("/scan", cfg.Handlers.CycleCountHandler.RecordScan)
			cycleCounts.POST("/:id/submit", cfg.Handlers.CycleCountHandler.SubmitForApproval)
			cycleCounts.POST("/submit", cfg.Handlers.CycleCountHandler.SubmitForApproval)
			cycleCounts.POST("/:id/approve", cfg.Handlers.CycleCountHandler.ApproveCycleCount)
			cycleCounts.POST("/approve", cfg.Handlers.CycleCountHandler.ApproveCycleCount)
			cycleCounts.POST("/:id/transfer_ownership", cfg.Handlers.CycleCountHandler.TransferOwnership)
			cycleCounts.POST("/transfer", cfg.Handlers.CycleCountHandler.TransferOwnership)
			cycleCounts.GET("/search", cfg.Handlers.CycleCountHandler.SearchCycleCounts)
			cycleCounts.GET("/schedule", cfg.Handlers.CycleCountHandler.GetSchedule)
			cycleCounts.POST("/schedule", cfg.Handlers.CycleCountHandler.CreateScheduleEntry)
		}
	}

	return router
}
