package router

import (
	"net/http"
	"os"
	"radius/internal/handler"
	"radius/internal/middleware"
	"radius/internal/models"
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
				"status":  http.StatusOK,
				"message": "Server is working!",
			})
		})

		public.POST("/login", cfg.Handlers.AuthHandler.Login)
	}

	api := router.Group("/api")
	api.Use(middleware.RequireAuth(cfg.JWTSecret, cfg.AuthService))
	{
		api.POST("/logout", cfg.Handlers.AuthHandler.Logout)
	}

	admin := router.Group("/api/admin")
	admin.Use(middleware.RequireAuth(cfg.JWTSecret, cfg.AuthService))
	admin.Use(middleware.RequireRole(models.RoleAdmin))
	{
		admin.POST("/create_employees", cfg.Handlers.AuthHandler.Register)
		admin.GET("/get_all_sessions", cfg.Handlers.SessionHandler.GetAllSessions)
	}

	return router
}
