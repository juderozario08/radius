package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"radius/internal/config"
	"radius/internal/database"
	"radius/internal/handler"
	"radius/internal/logging"
	"radius/internal/repository"
	"radius/internal/router"
	"radius/internal/service"
	"radius/internal/websocket"
	"syscall"
	"time"
)

func main() {
	logging.Setup(os.Getenv("GIN_MODE"), os.Getenv("LOG_LEVEL"))
	if err := run(); err != nil {
		slog.Error("server exited with error", "error", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.LoadConfig()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	logging.Setup(cfg.GinMode, cfg.LogLevel)

	db, err := database.ConnectDB(cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("connect to database: %w", err)
	}
	defer db.Close()

	redisClient, err := database.ConnectRedis(cfg.RedisURL)
	if err != nil {
		return fmt.Errorf("connect to redis: %w", err)
	}
	defer redisClient.Close()

	if cfg.RunMigrations {
		if err = db.RunMigrations("migrations"); err != nil {
			return fmt.Errorf("run migrations: %w", err)
		}
	} else {
		slog.Info("skipping automatic migrations (RUN_MIGRATIONS not enabled)")
	}

	employeeRepo := repository.NewEmployeeRepo(db.DB)
	sessionRepo := repository.NewSessionRepo(db.DB)
	storeRepo := repository.NewStoreRepo(db.DB)
	inventoryRepo := repository.NewInventoryRepo(db.DB)
	ordersRepo := repository.NewOrdersRepo(db.DB)
	productsRepo := repository.NewProductRepo(db.DB)
	categoryRepo := repository.NewCategoryRepo(db.DB)
	salesRepo := repository.NewSalesRepo(db.DB)
	receivingRepo := repository.NewReceivingRepo(db.DB)
	auditRepo := repository.NewAuditRepo(db.DB)
	cycleCountRepo := repository.NewCycleCountRepo(db.DB)
	fillReportRepo := repository.NewFillReportRepository(db.DB)
	transferRepo := repository.NewTransferRepo(db.DB)
	returnsRepo := repository.NewReturnsRepo(db.DB)

	wsHub := websocket.NewHub()
	go wsHub.Run()

	sessionService := service.NewSessionService(sessionRepo, cfg.JWTSecretKey, redisClient)
	employeeService := service.NewEmployeeService(employeeRepo, sessionService, redisClient)
	authService := service.NewAuthService(employeeRepo, sessionService, employeeService)
	authService.SetRedisClient(redisClient)
	cycleCountService := service.NewCycleCountService(cycleCountRepo, employeeRepo, storeRepo, productsRepo, inventoryRepo, sessionRepo, wsHub)
	cycleCountService.SetRedisClient(redisClient)
	fillReportService := service.NewFillReportService(fillReportRepo, storeRepo, employeeRepo, sessionRepo, inventoryRepo, productsRepo, redisClient)
	inventoryService := service.NewInventoryService(storeRepo, employeeRepo, sessionRepo, inventoryRepo, productsRepo, redisClient)
	onlineOrderService := service.NewOnlineOrderService(ordersRepo, productsRepo, inventoryRepo, sessionRepo, storeRepo, employeeRepo, wsHub)
	onlineOrderService.SetRedisClient(redisClient)
	workerCtx, workerCancel := context.WithCancel(context.Background())
	defer workerCancel()
	onlineOrderService.StartBOPISAutoCancelWorker(workerCtx, 1*time.Hour)
	productService := service.NewProductService(productsRepo, storeRepo, employeeRepo, sessionRepo, redisClient)
	categoryService := service.NewCategoryService(categoryRepo, redisClient)
	storeService := service.NewStoreService(storeRepo, employeeRepo, productsRepo, redisClient)
	transactionService := service.NewTransactionService(salesRepo, employeeRepo, sessionRepo, fillReportRepo, wsHub, redisClient)
	transferService := service.NewTransferService(transferRepo, employeeRepo, wsHub)
	receivingService := service.NewReceivingService(receivingRepo, employeeRepo, redisClient)
	auditService := service.NewAuditService(auditRepo, employeeRepo, productsRepo)
	printOrderService := service.NewPrintOrderService(ordersRepo, employeeRepo)
	printOrderService.SetBroadcaster(wsHub)
	returnsService := service.NewReturnsService(returnsRepo, employeeRepo, productsRepo, salesRepo, storeRepo, wsHub)

	upgrader := websocket.NewUpgrader(websocket.UpgraderConfig{
		ReadBufferSize:   4096,
		WriteBufferSize:  4096,
		HandshakeTimeout: 10 * time.Second,
		AllowedOrigins:   cfg.AllowedOriginsList(),
		FailClosed:       cfg.IsRelease,
	})
	wsHandler := handler.NewWSHandler(
		wsHub,
		authService,
		upgrader,
		redisClient,
	)

	appHandlers := router.Handlers{
		AuditHandler:       handler.NewAuditHandler(auditService),
		AuthHandler:        handler.NewAuthHandler(authService),
		CategoryHandler:    handler.NewCategoryHandler(categoryService),
		CycleCountHandler:  handler.NewCycleCountHandler(cycleCountService),
		FillReportHandler:  handler.NewFillReportHandler(fillReportService),
		InventoryHandler:   handler.NewInventoryHandler(inventoryService),
		OnlineOrderHandler: handler.NewOnlineOrderHandler(onlineOrderService),
		ProductHandler:     handler.NewProductHandler(productService),
		ReceivingHandler:   handler.NewReceivingHandler(receivingService),
		StoreHandler:       handler.NewStoreHandler(storeService),
		TransactionHandler: handler.NewTransactionHandler(transactionService),
		TransferHandler:    handler.NewTransferHandler(transferService),
		SessionHandler:     handler.NewSessionHandler(sessionService),
		EmployeeHandler:    handler.NewEmployeeHandler(employeeService),
		PrintOrderHandler:  handler.NewPrintOrderHandler(printOrderService),
		ReturnsHandler:     handler.NewReturnsHandler(returnsService),
		WSHandler:          wsHandler,
		MetricsHandler:     handler.NewMetricsHandler(db.DB, redisClient),
	}

	router := router.NewRouter(router.Config{
		Handlers:    appHandlers,
		AuthService: authService,
		AppConfig:   cfg,
		DB:          db.DB,
		RedisClient: redisClient,
	})

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	listenErr := make(chan error, 1)
	go func() {
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			listenErr <- err
		}
	}()
	slog.Info("server listening", "port", cfg.Port)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	var serveErr error
	select {
	case <-quit:
		slog.Info("shutting down server")
	case serveErr = <-listenErr:
		slog.Error("server listen failed", "error", serveErr)
	}

	wsHub.Stop()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("server forced to shutdown", "error", err)
	}

	slog.Info("server exiting")
	return serveErr
}
