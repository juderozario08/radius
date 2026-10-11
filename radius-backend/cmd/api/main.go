package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"radius/internal/config"
	"radius/internal/database"
	"radius/internal/handler"
	"radius/internal/repository"
	"radius/internal/router"
	"radius/internal/service"
	"radius/internal/websocket"
	"syscall"
	"time"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := database.ConnectDB(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Error connecting to database: %v\n", err)
	}
	defer db.Close()

	redisClient, err := database.ConnectRedis(cfg.RedisURL)
	if err != nil {
		log.Fatalf("Error connecting to Redis: %v\n", err)
	}
	defer redisClient.Close()

	if cfg.RunMigrations {
		if err = db.RunMigrations("migrations"); err != nil {
			log.Fatalf("Could not run migrations: %v", err)
		}
	} else {
		log.Println("Skipping automatic migrations (RUN_MIGRATIONS not enabled)")
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
		FailClosed:       cfg.IsRelease && len(cfg.AllowedOriginsList()) > 0,
	})
	wsHandler := handler.NewWSHandler(
		wsHub,
		cfg.JWTSecretKey,
		authService,
		employeeRepo,
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
		JWTSecret:   cfg.JWTSecretKey,
		AuthService: authService,
		AppConfig:   cfg,
		DB:          db.DB,
		RedisClient: redisClient,
	})

	if !cfg.IsRelease {
		fmt.Printf("Listening on PORT %s http://0.0.0.0:%s\n", cfg.Port, cfg.Port)
	}

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Listen: %s\n", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	wsHub.Stop()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exiting")
}
