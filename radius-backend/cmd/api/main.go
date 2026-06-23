package main

import (
	"fmt"
	"log"
	"os"
	"radius/internal/database"
	"radius/internal/handler"
	"radius/internal/repository"
	"radius/internal/router"
	"radius/internal/service"

	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Printf(".env file does not exist")
		return
	}

	db, err := database.ConnectDB()
	if err != nil {
		log.Printf("Error connecting to database: %v\n", err)
		return
	}

	err = db.RunMigrations("migrations")
	if err != nil {
		log.Printf("Could not run migrations: %v\n", err)
	}

	employeeRepo := repository.NewEmployeeRepo(db.DB)
	sessionRepo := repository.NewSessionRepo(db.DB)
	// storeRepo := repository.NewStoreRepo(db.DB)
	// inventoryRepo := repository.NewInventoryRepo(db.DB)
	// merchandisingRepo := repository.NewMerchandisingRepo(db.DB)
	// ordersRepo := repository.NewOrdersRepo(db.DB)
	// productsRepo := repository.NewProductRepo(db.DB)
	// salesRepo := repository.NewSalesRepo(db.DB)

	jwtSecretCode := os.Getenv("JWT_SECRET_KEY")
	if jwtSecretCode == "" {
		log.Printf("Could not find JWT_SECRET_KEY\n")
		return
	}

	authService := service.NewAuthService(employeeRepo, sessionRepo, []byte(jwtSecretCode))
	// barcodeService := service.NewBarcodeService()
	// cycleCountService := service.NewCycleCountService()
	// fillReportService := service.NewFillReportService()
	// inventoryService := service.NewInventoryService()
	// onlineOrderService := service.NewOnlineOrderService()
	// outOfStockService := service.NewOutOfStockService()
	// planogramService := service.NewPlanogramService()
	// posService := service.NewPOSService()
	// pricingService := service.NewPricingService()
	// productService := service.NewProductService()
	// storeService := service.NewStoreService()
	// transactionService := service.NewTransactionService()
	// transferService := service.NewTransferService()

	router := router.NewRouter(router.Handlers{
		AuthHandler:        handler.NewAuthHandler(authService),
		BarcodeHandler:     handler.NewBarcodeHandler(),
		CycleCountHandler:  handler.NewCycleCountHandler(),
		FillReportHandler:  handler.NewFillReportHandler(),
		InventoryHandler:   handler.NewInventoryHandler(),
		OnlineOrderHandler: handler.NewOnlineOrderHandler(),
		OutOfStockHandler:  handler.NewOutOfStockHandler(),
		PlanogramHandler:   handler.NewPlanogramHandler(),
		POSHandler:         handler.NewPOSHandler(),
		PricingHandler:     handler.NewPricingHandler(),
		ProductHandler:     handler.NewProductHandler(),
		StoreHandler:       handler.NewStoreHandler(),
		TransactionHandler: handler.NewTransactionHandler(),
		TransferHandler:    handler.NewTransactionHandler(),
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Println("Listening on PORT " + port)
	fmt.Println("http://0.0.0.0:" + port)
	router.Run()
}
