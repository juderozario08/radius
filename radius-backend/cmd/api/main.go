// radius-backend/cmd/api/main.go
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
	"syscall"
	"time"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	if len(cfg.JWTSecretKey) == 0 {
		log.Printf("Could not find JWT_SECRET_KEY\n")
		return
	}

	db, err := database.ConnectDB(cfg.DatabaseURL)
	if err != nil {
		log.Printf("Error connecting to database: %v\n", err)
		return
	}
	defer db.Close()

	redisClient, err := database.ConnectRedis(cfg.RedisURL)
	if err != nil {
		log.Printf("Error connecting to Redis: %v\n", err)
		return
	}
	defer redisClient.Close()

	if !cfg.IsRelease {
		err = db.RunMigrations("migrations")
		if err != nil {
			log.Printf("Could not run migrations: %v\n", err)
		}
	} else {
		log.Println("Skipping automatic migrations in release mode")
	}

	employeeRepo := repository.NewEmployeeRepo(db.DB)
	sessionRepo := repository.NewSessionRepo(db.DB)
	storeRepo := repository.NewStoreRepo(db.DB)
	inventoryRepo := repository.NewInventoryRepo(db.DB)
	merchandisingRepo := repository.NewMerchandisingRepo(db.DB)
	ordersRepo := repository.NewOrdersRepo(db.DB)
	productsRepo := repository.NewProductRepo(db.DB)
	categoryRepo := repository.NewCategoryRepo(db.DB)
	salesRepo := repository.NewSalesRepo(db.DB)
	receivingRepo := repository.NewReceivingRepo(db.DB)

	employeeService := service.NewEmployeeService(employeeRepo)
	sessionService := service.NewSessionService(sessionRepo, cfg.JWTSecretKey, redisClient)
	authService := service.NewAuthService(employeeRepo, sessionService)
	barcodeService := service.NewBarcodeService(storeRepo, employeeRepo, sessionRepo, inventoryRepo, productsRepo)
	cycleCountService := service.NewCycleCountService(storeRepo, employeeRepo, sessionRepo, inventoryRepo, productsRepo)
	fillReportService := service.NewFillReportService(storeRepo, employeeRepo, sessionRepo, inventoryRepo, productsRepo, redisClient)
	inventoryService := service.NewInventoryService(storeRepo, employeeRepo, sessionRepo, inventoryRepo, productsRepo)
	onlineOrderService := service.NewOnlineOrderService(ordersRepo, productsRepo, inventoryRepo, sessionRepo, storeRepo, employeeRepo)
	outOfStockService := service.NewOutOfStockService(productsRepo, inventoryRepo, sessionRepo, employeeRepo, storeRepo)
	planogramService := service.NewPlanogramService(merchandisingRepo, employeeRepo, storeRepo, sessionRepo)
	pricingService := service.NewPricingService(storeRepo, employeeRepo, sessionRepo, inventoryRepo)
	productService := service.NewProductService(productsRepo, storeRepo, employeeRepo, sessionRepo, redisClient)
	categoryService := service.NewCategoryService(categoryRepo, redisClient)
	storeService := service.NewStoreService(storeRepo, employeeRepo, productsRepo)
	transactionService := service.NewTransactionService(salesRepo, employeeRepo, sessionRepo)
	transferService := service.NewTransferService(storeRepo, inventoryRepo, employeeRepo, sessionRepo)
	receivingService := service.NewReceivingService(receivingRepo, employeeRepo)

	appHandlers := router.Handlers{
		AuthHandler:        handler.NewAuthHandler(authService),
		BarcodeHandler:     handler.NewBarcodeHandler(barcodeService),
		CategoryHandler:    handler.NewCategoryHandler(categoryService),
		CycleCountHandler:  handler.NewCycleCountHandler(cycleCountService),
		FillReportHandler:  handler.NewFillReportHandler(fillReportService),
		InventoryHandler:   handler.NewInventoryHandler(inventoryService),
		OnlineOrderHandler: handler.NewOnlineOrderHandler(onlineOrderService),
		OutOfStockHandler:  handler.NewOutOfStockHandler(outOfStockService),
		PlanogramHandler:   handler.NewPlanogramHandler(planogramService),
		PricingHandler:     handler.NewPricingHandler(pricingService),
		ProductHandler:     handler.NewProductHandler(productService),
		ReceivingHandler:   handler.NewReceivingHandler(receivingService),
		StoreHandler:       handler.NewStoreHandler(storeService),
		TransactionHandler: handler.NewTransactionHandler(transactionService),
		TransferHandler:    handler.NewTransferHandler(transferService),
		SessionHandler:     handler.NewSessionHandler(sessionService),
		EmployeeHandler:    handler.NewEmployeeHandler(employeeService),
	}



	router := router.NewRouter(router.Config{
		Handlers:    appHandlers,
		JWTSecret:   cfg.JWTSecretKey,
		AuthService: authService,
		AppConfig:   cfg,
	})

	if !cfg.IsRelease {
		fmt.Printf("Listening on PORT %s http://0.0.0.0:%s\n", cfg.Port, cfg.Port)
	}

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: router,
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

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exiting")
}
