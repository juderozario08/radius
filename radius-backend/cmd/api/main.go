package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"radius/internal/database"
	"radius/internal/handler"
	"radius/internal/repository"
	"radius/internal/router"
	"radius/internal/service"
	"time"

	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Printf(".env file does not exist")
		return
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

	err = db.RunMigrations("migrations")
	if err != nil {
		log.Printf("Could not run migrations: %v\n", err)
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
	authService := service.NewAuthService(employeeRepo, sessionRepo, []byte(jwtSecretCode))
	sessionService := service.NewSessionService(employeeRepo, sessionRepo, []byte(jwtSecretCode))
	barcodeService := service.NewBarcodeService(storeRepo, employeeRepo, sessionRepo, inventoryRepo, productsRepo)
	cycleCountService := service.NewCycleCountService(storeRepo, employeeRepo, sessionRepo, inventoryRepo, productsRepo)
	fillReportService := service.NewFillReportService(storeRepo, employeeRepo, sessionRepo, inventoryRepo, productsRepo)
	inventoryService := service.NewInventoryService(storeRepo, employeeRepo, sessionRepo, inventoryRepo, productsRepo)
	onlineOrderService := service.NewOnlineOrderService(ordersRepo, productsRepo, inventoryRepo, sessionRepo, storeRepo)
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
	authService.StartSessionCleanupWorker(bgCtx, 24*time.Hour)

	router := router.NewRouter(router.Config{
		Handlers:    appHandlers,
		JWTSecret:   jwtSecret,
		AuthService: authService,
	})

	fmt.Printf("Listening on PORT %s http:://0.0.0.0:%s\n", port, port)
	router.Run()
}
