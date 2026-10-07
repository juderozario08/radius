package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"radius/internal/cache"
	"radius/internal/database"
	"radius/internal/models"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"golang.org/x/sync/singleflight"
)

type storeInventoryCache struct {
	OnHandQty     int        `json:"on_hand_qty"`
	ReservedQty   int        `json:"reserved_qty"`
	AvailableQty  int        `json:"available_qty"`
	ReorderQty    int        `json:"reorder_qty"`
	Aisle         *string    `json:"aisle"`
	MimsLocation  *string    `json:"mims_location"`
	LastCountedAt *time.Time `json:"last_counted_at"`
}

type catalogBarcodeCache struct {
	ProductId     int     `json:"product_id"`
	Sku           string  `json:"sku"`
	Upc           string  `json:"upc"`
	Name          string  `json:"name"`
	Brand         string  `json:"brand"`
	Description   *string `json:"description"`
	UnitOfMeasure string  `json:"unit_of_measure"`
	UnitsPerCase  int     `json:"units_per_case"`
	Weight        float32 `json:"weight"`
	IsActive      bool    `json:"is_active"`
	NotFound      bool    `json:"not_found,omitempty"`
}

type InventoryService struct {
	storeRepo     StoreRepository
	employeeRepo  EmployeeRepository
	sessionRepo   SessionRepository
	inventoryRepo InventoryRepository
	productsRepo  ProductRepository
	redisClient   *redis.Client
	sfGroup       singleflight.Group
}

func NewInventoryService(
	storeRepo StoreRepository,
	employeeRepo EmployeeRepository,
	sessionRepo SessionRepository,
	inventoryRepo InventoryRepository,
	productsRepo ProductRepository,
	redisClient *redis.Client,
) *InventoryService {
	return &InventoryService{
		storeRepo:     storeRepo,
		employeeRepo:  employeeRepo,
		sessionRepo:   sessionRepo,
		inventoryRepo: inventoryRepo,
		productsRepo:  productsRepo,
		redisClient:   redisClient,
	}
}

func (s *InventoryService) InvalidateInventoryCache(ctx context.Context, storeId int, productId int, optionalBarcode ...string) {
	if s.redisClient == nil {
		return
	}
	tier2Key := cache.InventoryProductKey(storeId, productId)
	if err := s.redisClient.Del(ctx, tier2Key).Err(); err != nil && !errors.Is(err, redis.Nil) {
		database.CacheMetrics.RecordDeleteError()
		log.Printf("[WARN] Failed to invalidate %s: %v", tier2Key, err)
	}
	for _, b := range optionalBarcode {
		if b != "" {
			legacyKey := cache.LegacyInventoryBarcodeKey(storeId, b)
			_ = s.redisClient.Del(ctx, legacyKey).Err()
			catalogBarcodeKey := cache.CatalogBarcodeKey(b)
			_ = s.redisClient.Del(ctx, catalogBarcodeKey).Err()
		}
	}
}

func (s *InventoryService) InvalidateStoreInventoryCache(ctx context.Context, storeId int) {
	if s.redisClient == nil {
		return
	}
	patterns := []string{
		cache.InventoryStorePattern(storeId),
		cache.LegacyInventoryStorePattern(storeId),
	}
	for _, pat := range patterns {
		iter := s.redisClient.Scan(ctx, 0, pat, 100).Iterator()
		for iter.Next(ctx) {
			_ = s.redisClient.Del(ctx, iter.Val()).Err()
		}
	}
}

func (s *InventoryService) ScanProduct(ctx context.Context, storeId int, employeeId int, barcode string) (*models.ScanProductResponse, error) {
	barcode = strings.ToUpper(strings.TrimSpace(barcode))
	tier1Key := cache.CatalogBarcodeKey(barcode)
	legacyKey := cache.LegacyInventoryBarcodeKey(storeId, barcode)

	if s.redisClient != nil {
		t1Val, t1Err := s.redisClient.Get(ctx, tier1Key).Result()
		if t1Err == nil {
			var t1 catalogBarcodeCache
			if json.Unmarshal([]byte(t1Val), &t1) == nil {
				if t1.NotFound {
					database.CacheMetrics.RecordNegativeHit()
					go func() {
						_ = s.inventoryRepo.LogScan(context.Background(), models.MimsScanLog{
							StoreId:        storeId,
							EmployeeId:     employeeId,
							ProductId:      nil,
							ScannedBarcode: barcode,
							ScanType:       "MIMS",
						})
					}()
					return &models.ScanProductResponse{
						Product: nil,
						Message: "No product found for this barcode",
					}, nil
				}

				tier2Key := cache.InventoryProductKey(storeId, t1.ProductId)
				t2Val, t2Err := s.redisClient.Get(ctx, tier2Key).Result()
				if t2Err == nil {
					var t2 storeInventoryCache
					if json.Unmarshal([]byte(t2Val), &t2) == nil {
						database.CacheMetrics.RecordHit()
						combined := models.MimsProductInventory{
							ProductId:     t1.ProductId,
							Sku:           t1.Sku,
							Upc:           t1.Upc,
							Name:          t1.Name,
							Brand:         t1.Brand,
							Description:   t1.Description,
							UnitOfMeasure: t1.UnitOfMeasure,
							UnitsPerCase:  t1.UnitsPerCase,
							Weight:        t1.Weight,
							IsActive:      t1.IsActive,
							OnHandQty:     t2.OnHandQty,
							ReservedQty:   t2.ReservedQty,
							AvailableQty:  t2.AvailableQty,
							ReorderQty:    t2.ReorderQty,
							Aisle:         t2.Aisle,
							MimsLocation:  t2.MimsLocation,
							LastCountedAt: t2.LastCountedAt,
						}
						go func() {
							_ = s.inventoryRepo.LogScan(context.Background(), models.MimsScanLog{
								StoreId:        storeId,
								EmployeeId:     employeeId,
								ProductId:      &combined.ProductId,
								ScannedBarcode: barcode,
								ScanType:       "MIMS",
							})
						}()
						return &models.ScanProductResponse{
							Product: &combined,
							Message: "Product found",
						}, nil
					}
					database.CacheMetrics.RecordSerializationFailure()
					_ = s.redisClient.Del(ctx, tier2Key).Err()
				} else if !errors.Is(t2Err, redis.Nil) {
					database.CacheMetrics.RecordFallback()
					log.Printf("[WARN] Redis get failed for %s: %v", tier2Key, t2Err)
				}
			} else {
				database.CacheMetrics.RecordSerializationFailure()
				_ = s.redisClient.Del(ctx, tier1Key).Err()
			}
		} else if !errors.Is(t1Err, redis.Nil) {
			database.CacheMetrics.RecordFallback()
			log.Printf("[WARN] Redis get failed for %s: %v", tier1Key, t1Err)
		}

		val, err := s.redisClient.Get(ctx, legacyKey).Result()
		if err == nil {
			var product models.MimsProductInventory
			if json.Unmarshal([]byte(val), &product) == nil {
				database.CacheMetrics.RecordHit()
				tier2Key := cache.InventoryProductKey(storeId, product.ProductId)
				t1Data, mErr1 := json.Marshal(catalogBarcodeCache{
					ProductId:     product.ProductId,
					Sku:           product.Sku,
					Upc:           product.Upc,
					Name:          product.Name,
					Brand:         product.Brand,
					Description:   product.Description,
					UnitOfMeasure: product.UnitOfMeasure,
					UnitsPerCase:  product.UnitsPerCase,
					Weight:        product.Weight,
					IsActive:      product.IsActive,
				})
				if mErr1 == nil {
					t1TTL := cache.ApplyJitter(24*time.Hour, 2*time.Hour)
					_ = s.redisClient.Set(ctx, tier1Key, t1Data, t1TTL).Err()
				}
				t2Data, mErr2 := json.Marshal(storeInventoryCache{
					OnHandQty:     product.OnHandQty,
					ReservedQty:   product.ReservedQty,
					AvailableQty:  product.AvailableQty,
					ReorderQty:    product.ReorderQty,
					Aisle:         product.Aisle,
					MimsLocation:  product.MimsLocation,
					LastCountedAt: product.LastCountedAt,
				})
				if mErr2 == nil {
					t2TTL := cache.ApplyJitter(5*time.Minute, 30*time.Second)
					_ = s.redisClient.Set(ctx, tier2Key, t2Data, t2TTL).Err()
				}
				_ = s.redisClient.Del(ctx, legacyKey).Err()

				go func() {
					_ = s.inventoryRepo.LogScan(context.Background(), models.MimsScanLog{
						StoreId:        storeId,
						EmployeeId:     employeeId,
						ProductId:      &product.ProductId,
						ScannedBarcode: barcode,
						ScanType:       "MIMS",
					})
				}()
				return &models.ScanProductResponse{
					Product: &product,
					Message: "Product found",
				}, nil
			}
			database.CacheMetrics.RecordSerializationFailure()
			_ = s.redisClient.Del(ctx, legacyKey).Err()
		} else if !errors.Is(err, redis.Nil) {
			database.CacheMetrics.RecordFallback()
			log.Printf("[WARN] Redis get failed for %s: %v", legacyKey, err)
		}
	}

	database.CacheMetrics.RecordMiss()

	sfKey := fmt.Sprintf("scan:%d:%s", storeId, barcode)
	v, err, _ := s.sfGroup.Do(sfKey, func() (any, error) {
		product, dbErr := s.inventoryRepo.GetInventoryByBarcode(ctx, storeId, barcode)
		if dbErr != nil {
			return nil, dbErr
		}

		var productId *int
		if product != nil {
			productId = &product.ProductId
		}

		_ = s.inventoryRepo.LogScan(ctx, models.MimsScanLog{
			StoreId:        storeId,
			EmployeeId:     employeeId,
			ProductId:      productId,
			ScannedBarcode: barcode,
			ScanType:       "MIMS",
		})

		if product == nil {
			if s.redisClient != nil {
				negPayload, _ := json.Marshal(catalogBarcodeCache{NotFound: true})
				negTTL := cache.ApplyJitter(60*time.Second, 15*time.Second)
				if setErr := s.redisClient.Set(ctx, tier1Key, negPayload, negTTL).Err(); setErr != nil {
					database.CacheMetrics.RecordSetError()
					log.Printf("[WARN] Redis negative cache set failed for %s: %v", tier1Key, setErr)
				}
			}
			return &models.ScanProductResponse{
				Product: nil,
				Message: "No product found for this barcode",
			}, nil
		}

		if s.redisClient != nil {
			t1Data, mErr := json.Marshal(catalogBarcodeCache{
				ProductId:     product.ProductId,
				Sku:           product.Sku,
				Upc:           product.Upc,
				Name:          product.Name,
				Brand:         product.Brand,
				Description:   product.Description,
				UnitOfMeasure: product.UnitOfMeasure,
				UnitsPerCase:  product.UnitsPerCase,
				Weight:        product.Weight,
				IsActive:      product.IsActive,
			})
			if mErr == nil {
				t1TTL := cache.ApplyJitter(24*time.Hour, 2*time.Hour)
				if setErr := s.redisClient.Set(ctx, tier1Key, t1Data, t1TTL).Err(); setErr != nil {
					database.CacheMetrics.RecordSetError()
					log.Printf("[WARN] Redis Tier 1 cache set failed for %s: %v", tier1Key, setErr)
				}
			} else {
				database.CacheMetrics.RecordSerializationFailure()
			}

			t2Data, mErr := json.Marshal(storeInventoryCache{
				OnHandQty:     product.OnHandQty,
				ReservedQty:   product.ReservedQty,
				AvailableQty:  product.AvailableQty,
				ReorderQty:    product.ReorderQty,
				Aisle:         product.Aisle,
				MimsLocation:  product.MimsLocation,
				LastCountedAt: product.LastCountedAt,
			})
			if mErr == nil {
				tier2Key := cache.InventoryProductKey(storeId, product.ProductId)
				t2TTL := cache.ApplyJitter(5*time.Minute, 30*time.Second)
				if setErr := s.redisClient.Set(ctx, tier2Key, t2Data, t2TTL).Err(); setErr != nil {
					database.CacheMetrics.RecordSetError()
					log.Printf("[WARN] Redis Tier 2 cache set failed for %s: %v", tier2Key, setErr)
				}
			} else {
				database.CacheMetrics.RecordSerializationFailure()
			}
		}

		return &models.ScanProductResponse{
			Product: product,
			Message: "Product found",
		}, nil
	})

	if err != nil {
		return nil, err
	}
	return v.(*models.ScanProductResponse), nil
}

func (s *InventoryService) GetLocationProducts(ctx context.Context, storeId int, employeeId int, locationID string) (*models.LocationProductsResponse, error) {
	_ = s.inventoryRepo.LogScan(ctx, models.MimsScanLog{
		StoreId:        storeId,
		EmployeeId:     employeeId,
		ScannedBarcode: locationID,
		MimsLocationId: &locationID,
		ScanType:       "LOCATION",
	})

	exists, err := s.inventoryRepo.CheckLocationExists(ctx, storeId, locationID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return &models.LocationProductsResponse{
			LocationId: locationID,
			Products:   nil,
			Message:    "Bin location does not exist",
		}, nil
	}

	products, err := s.inventoryRepo.GetProductsByLocation(ctx, storeId, locationID)
	if err != nil {
		return nil, err
	}

	return &models.LocationProductsResponse{
		LocationId: locationID,
		Products:   products,
		Message:    "Location products retrieved",
	}, nil
}

func (s *InventoryService) BinItem(ctx context.Context, storeId int, employeeId int, req models.BinItemRequest) (*models.MimsProductInventory, error) {
	exists, err := s.inventoryRepo.CheckLocationExists(ctx, storeId, req.LocationId)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.New("location does not exist")
	}

	inventory, err := s.inventoryRepo.GetInventoryByBarcode(ctx, storeId, req.Barcode)
	if err != nil {
		return nil, err
	}
	if inventory == nil {
		return nil, errors.New("product not found in inventory")
	}

	_ = s.inventoryRepo.LogScan(ctx, models.MimsScanLog{
		StoreId:        storeId,
		EmployeeId:     employeeId,
		ProductId:      &inventory.ProductId,
		ScannedBarcode: req.Barcode,
		MimsLocationId: &req.LocationId,
		ScanType:       "BIN_" + req.Action,
	})

	switch req.Action {
	case "OUT":
		inLocation, err := s.inventoryRepo.CheckProductInLocation(ctx, storeId, req.LocationId, inventory.ProductId)
		if err != nil {
			return nil, err
		}
		if !inLocation {
			return nil, fmt.Errorf("%w: product is not in this bin", ErrNotFound)
		}
		err = s.inventoryRepo.IncrementInventoryQuantity(ctx, storeId, inventory.ProductId, -1)
		if err != nil {
			return nil, err
		}
		s.InvalidateInventoryCache(ctx, storeId, inventory.ProductId, req.Barcode)
	case "IN":
		err = s.inventoryRepo.LinkProductToLocation(ctx, storeId, req.LocationId, inventory.ProductId)
		if err != nil {
			return nil, err
		}
		err = s.inventoryRepo.IncrementInventoryQuantity(ctx, storeId, inventory.ProductId, 1)
		if err != nil {
			return nil, err
		}
		s.InvalidateInventoryCache(ctx, storeId, inventory.ProductId, req.Barcode)
	}

	return s.inventoryRepo.GetInventoryByBarcode(ctx, storeId, req.Barcode)
}

func (s *InventoryService) UpdateQuantity(ctx context.Context, storeId int, req models.UpdateQuantityRequest) error {
	err := s.inventoryRepo.UpdateInventoryQuantity(ctx, storeId, req.ProductId, req.Quantity)
	if err == nil {
		s.InvalidateInventoryCache(ctx, storeId, req.ProductId)
	}
	return err
}

func (s *InventoryService) GetProductScreenDetails(ctx context.Context, storeId int, productID int) (*models.ProductScreenDetails, error) {
	return s.inventoryRepo.GetProductScreenDetails(ctx, storeId, productID)
}

func (s *InventoryService) SyncLocations(ctx context.Context, storeId int, req models.SyncLocationsRequest) error {
	for _, loc := range req.Locations {
		if loc.MimsLocationId != nil {
			exists, err := s.inventoryRepo.CheckLocationExists(ctx, storeId, *loc.MimsLocationId)
			if err != nil {
				return err
			}
			if !exists {
				return fmt.Errorf("location %s does not exist", *loc.MimsLocationId)
			}
		}
	}

	err := s.inventoryRepo.SyncLocations(ctx, storeId, req.InventoryId, req.Locations)
	if err == nil {
		s.InvalidateStoreInventoryCache(ctx, storeId)
	}
	return err
}

func (s *InventoryService) CreateMimsLocation(ctx context.Context, storeId int, req models.CreateMimsLocationRequest) error {
	return s.inventoryRepo.CreateMimsLocation(ctx, storeId, req.LocationId)
}

func (s *InventoryService) CreateInventoryAdjustment(ctx context.Context, storeId int, employeeId int, req models.AdjustInventoryRequest) error {
	adj := models.InventoryAdjustment{
		StoreId:     storeId,
		InventoryId: req.InventoryId,
		ProductId:   req.ProductId,
		PreviousQty: req.PreviousQty,
		AdjustedQty: req.AdjustedQty,
		Reason:      req.Reason,
		RequestedBy: employeeId,
	}

	return s.inventoryRepo.CreateInventoryAdjustment(ctx, adj)
}

func (s *InventoryService) GetPendingAdjustments(ctx context.Context, storeId int) ([]models.PendingAdjustmentDetail, error) {
	return s.inventoryRepo.GetPendingAdjustments(ctx, storeId)
}

func (s *InventoryService) ReviewAdjustments(ctx context.Context, storeId int, employeeId int, role models.EmployeeRole, req models.ReviewAdjustmentRequest) error {
	if role != models.RoleManager && role != models.RoleAdmin {
		return ErrUnauthorized
	}

	err := s.inventoryRepo.ReviewAdjustments(ctx, storeId, employeeId, req.Reviews)
	if err == nil {
		s.InvalidateStoreInventoryCache(ctx, storeId)
	}
	return err
}
