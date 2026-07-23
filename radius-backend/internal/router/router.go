// radius-backend/internal/router/router.go
package router

import (
	"net/http"
	"os"
	"radius/internal/handler"
	"radius/internal/middleware"
	"radius/internal/service"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type Config struct {
	Handlers    Handlers
	JWTSecret   []byte
	AuthService *service.AuthService
}

type Handlers struct {
	AuthHandler        *handler.AuthHandler
	EmployeeHandler    *handler.EmployeeHandler
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
	TransferHandler    *handler.TransferHandler
	SessionHandler     *handler.SessionHandler
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

	router.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	public := router.Group("/")
	{
		public.GET("/health", func(ctx *gin.Context) {
			ctx.JSON(http.StatusOK, gin.H{
				"message": "Server is working!",
			})
		})

		public.POST("/login", cfg.Handlers.AuthHandler.Login)
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
			ctx.JSON(http.StatusOK, gin.H{
				"message": "Admin route is working!",
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
			ctx.JSON(http.StatusOK, gin.H{
				"message": "Manager route is working!",
			})
		})

		manager.GET("/get_store", cfg.Handlers.StoreHandler.GetStore)
	}

	return router
}
