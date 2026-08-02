// radius-backend/cmd/api/main.go
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"radius/internal/database"
	"radius/internal/handler"
	"radius/internal/repository"
	"radius/internal/router"
	"radius/internal/service"
	"syscall"
	"time"

	"github.com/joho/godotenv"
)

func main() {
	if os.Getenv("GIN_MODE") != "release" {
		err := godotenv.Load()
		if err != nil {
			log.Printf("Error loading .env file: %v", err)
		} else {
			log.Println("Loaded local .env file successfully")
		}
	}

	jwtSecretCode := os.Getenv("JWT_SECRET_KEY")
	if jwtSecretCode == "" {
		log.Printf("Could not find JWT_SECRET_KEY\n")
		return
	}
	jwtSecret := []byte(jwtSecretCode)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	db, err := database.ConnectDB()
	if err != nil {
		log.Printf("Error connecting to database: %v\n", err)
		return
	}
	defer db.Close()

	if os.Getenv("GIN_MODE") != "release" {
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
	salesRepo := repository.NewSalesRepo(db.DB)

	employeeService := service.NewEmployeeService(employeeRepo)
	sessionService := service.NewSessionService(sessionRepo, []byte(jwtSecretCode))
	authService := service.NewAuthService(employeeRepo, sessionService)
	barcodeService := service.NewBarcodeService(storeRepo, employeeRepo, sessionRepo, inventoryRepo, productsRepo)
	cycleCountService := service.NewCycleCountService(storeRepo, employeeRepo, sessionRepo, inventoryRepo, productsRepo)
	fillReportService := service.NewFillReportService(storeRepo, employeeRepo, sessionRepo, inventoryRepo, productsRepo)
	inventoryService := service.NewInventoryService(storeRepo, employeeRepo, sessionRepo, inventoryRepo, productsRepo)
	onlineOrderService := service.NewOnlineOrderService(ordersRepo, productsRepo, inventoryRepo, sessionRepo, storeRepo, employeeRepo)
	outOfStockService := service.NewOutOfStockService(productsRepo, inventoryRepo, sessionRepo, employeeRepo, storeRepo)
	planogramService := service.NewPlanogramService(merchandisingRepo, employeeRepo, storeRepo, sessionRepo)
	posService := service.NewPOSService(salesRepo, employeeRepo, sessionRepo, storeRepo)
	pricingService := service.NewPricingService(storeRepo, employeeRepo, sessionRepo, inventoryRepo)
	productService := service.NewProductService(productsRepo, storeRepo, employeeRepo, sessionRepo)
	storeService := service.NewStoreService(storeRepo, employeeRepo, productsRepo)
	transactionService := service.NewTransactionService(salesRepo, employeeRepo, sessionRepo)
	transferService := service.NewTransferService(storeRepo, inventoryRepo, employeeRepo, sessionRepo)

	appHandlers := router.Handlers{
		AuthHandler:        handler.NewAuthHandler(authService),
		BarcodeHandler:     handler.NewBarcodeHandler(barcodeService),
		CycleCountHandler:  handler.NewCycleCountHandler(cycleCountService),
		FillReportHandler:  handler.NewFillReportHandler(fillReportService),
		InventoryHandler:   handler.NewInventoryHandler(inventoryService),
		OnlineOrderHandler: handler.NewOnlineOrderHandler(onlineOrderService),
		OutOfStockHandler:  handler.NewOutOfStockHandler(outOfStockService),
		PlanogramHandler:   handler.NewPlanogramHandler(planogramService),
		POSHandler:         handler.NewPOSHandler(posService),
		PricingHandler:     handler.NewPricingHandler(pricingService),
		ProductHandler:     handler.NewProductHandler(productService),
		StoreHandler:       handler.NewStoreHandler(storeService),
		TransactionHandler: handler.NewTransactionHandler(transactionService),
		TransferHandler:    handler.NewTransferHandler(transferService),
		SessionHandler:     handler.NewSessionHandler(sessionService),
		EmployeeHandler:    handler.NewEmployeeHandler(employeeService),
	}

	bgCtx := context.Background()
	sessionService.StartSessionCleanupWorker(bgCtx, 24*time.Hour)

	router := router.NewRouter(router.Config{
		Handlers:    appHandlers,
		JWTSecret:   jwtSecret,
		AuthService: authService,
	})

	if os.Getenv("GIN_MODE") != "release" {
		fmt.Printf("Listening on PORT %s http://0.0.0.0:%s\n", port, port)
	}

	srv := &http.Server{
		Addr:    ":" + port,
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
