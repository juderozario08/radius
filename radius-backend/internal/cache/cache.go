package cache

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

const Namespace = "radius:v1"

type SerializationFormat string

const (
	FormatJSON      SerializationFormat = "json"
	FormatRedisHash SerializationFormat = "redis-hash"
	FormatRaw       SerializationFormat = "raw"
)

type CacheScope string

const (
	ScopeGlobal CacheScope = "global"
	ScopeStore  CacheScope = "store"
	ScopeUser   CacheScope = "user"
)

type Metadata struct {
	Name                string
	KeyPattern          string
	OwnerService        string
	ValueShape          string
	SerializationFormat SerializationFormat
	DefaultTTL          time.Duration
	JitterRange         time.Duration
	NegativeCacheTTL    time.Duration
	Scope               CacheScope
	InvalidationEvents  []string
	FallbackBehavior    string
}

var Registry = map[string]Metadata{
	"auth:token": {
		Name:                "auth:token",
		KeyPattern:          "radius:v1:auth:token:<token_hash>",
		OwnerService:        "SessionService",
		ValueShape:          "int (session_id)",
		SerializationFormat: FormatRaw,
		DefaultTTL:          24 * time.Hour,
		JitterRange:         0,
		NegativeCacheTTL:    0,
		Scope:               ScopeUser,
		InvalidationEvents:  []string{"logout", "session_terminate", "token_refresh", "password_change"},
		FallbackBehavior:    "PostgreSQL SessionRepository with strict status validation",
	},
	"catalog:product": {
		Name:                "catalog:product",
		KeyPattern:          "radius:v1:catalog:product:<product_id>",
		OwnerService:        "ProductService",
		ValueShape:          "models.Product",
		SerializationFormat: FormatJSON,
		DefaultTTL:          5 * time.Minute,
		JitterRange:         30 * time.Second,
		NegativeCacheTTL:    0,
		Scope:               ScopeGlobal,
		InvalidationEvents:  []string{"product_update", "product_delete"},
		FallbackBehavior:    "PostgreSQL ProductRepository via singleflight",
	},
	"catalog:barcode": {
		Name:                "catalog:barcode",
		KeyPattern:          "radius:v1:catalog:barcode:<barcode>",
		OwnerService:        "InventoryService",
		ValueShape:          "catalogBarcodeCache",
		SerializationFormat: FormatJSON,
		DefaultTTL:          24 * time.Hour,
		JitterRange:         2 * time.Hour,
		NegativeCacheTTL:    60 * time.Second,
		Scope:               ScopeGlobal,
		InvalidationEvents:  []string{"product_update", "barcode_reassignment"},
		FallbackBehavior:    "PostgreSQL InventoryRepository via singleflight",
	},
	"catalog:categories": {
		Name:                "catalog:categories",
		KeyPattern:          "radius:v1:catalog:categories",
		OwnerService:        "CategoryService",
		ValueShape:          "[]models.Category",
		SerializationFormat: FormatJSON,
		DefaultTTL:          1 * time.Hour,
		JitterRange:         5 * time.Minute,
		NegativeCacheTTL:    0,
		Scope:               ScopeGlobal,
		InvalidationEvents:  []string{"category_create", "category_update", "category_delete"},
		FallbackBehavior:    "PostgreSQL CategoryRepository via singleflight",
	},
	"catalog:brands": {
		Name:                "catalog:brands",
		KeyPattern:          "radius:v1:catalog:brands",
		OwnerService:        "CategoryService",
		ValueShape:          "[]string",
		SerializationFormat: FormatJSON,
		DefaultTTL:          1 * time.Hour,
		JitterRange:         5 * time.Minute,
		NegativeCacheTTL:    0,
		Scope:               ScopeGlobal,
		InvalidationEvents:  []string{"product_create", "product_update"},
		FallbackBehavior:    "PostgreSQL CategoryRepository via singleflight",
	},
	"inventory:store:product": {
		Name:                "inventory:store:product",
		KeyPattern:          "radius:v1:inventory:store:<store_id>:product:<product_id>",
		OwnerService:        "InventoryService",
		ValueShape:          "storeInventoryCache",
		SerializationFormat: FormatJSON,
		DefaultTTL:          5 * time.Minute,
		JitterRange:         30 * time.Second,
		NegativeCacheTTL:    0,
		Scope:               ScopeStore,
		InvalidationEvents:  []string{"sale", "return", "receive", "transfer", "bin_move", "adjustment", "cycle_count"},
		FallbackBehavior:    "PostgreSQL InventoryRepository via singleflight",
	},
	"is4tc:store": {
		Name:                "is4tc:store",
		KeyPattern:          "radius:v1:is4tc:store:<store_id>",
		OwnerService:        "FillReportService",
		ValueShape:          "hash of product_id -> models.MimsProductInventory",
		SerializationFormat: FormatRedisHash,
		DefaultTTL:          24 * time.Hour,
		JitterRange:         0,
		NegativeCacheTTL:    0,
		Scope:               ScopeStore,
		InvalidationEvents:  []string{"session_clear"},
		FallbackBehavior:    "Empty session slice or PostgreSQL fill report",
	},
	"store:directory": {
		Name:                "store:directory",
		KeyPattern:          "radius:v1:store:directory:<page>:<page_size>",
		OwnerService:        "StoreService",
		ValueShape:          "models.GetAllStoresResponse",
		SerializationFormat: FormatJSON,
		DefaultTTL:          6 * time.Hour,
		JitterRange:         15 * time.Minute,
		NegativeCacheTTL:    0,
		Scope:               ScopeGlobal,
		InvalidationEvents:  []string{"store_create", "store_update", "store_activate", "store_deactivate"},
		FallbackBehavior:    "PostgreSQL StoreRepository via singleflight",
	},
	"store:operations": {
		Name:                "store:operations",
		KeyPattern:          "radius:v1:store:operations:<store_id>",
		OwnerService:        "StoreService",
		ValueShape:          "[]models.StoreOperationSummary",
		SerializationFormat: FormatJSON,
		DefaultTTL:          30 * time.Second,
		JitterRange:         5 * time.Second,
		NegativeCacheTTL:    0,
		Scope:               ScopeStore,
		InvalidationEvents:  []string{"order_status_change", "po_status_change", "cycle_count_status_change"},
		FallbackBehavior:    "PostgreSQL StoreRepository via singleflight",
	},
	"employee:context": {
		Name:                "employee:context",
		KeyPattern:          "radius:v1:employee:<employee_id>",
		OwnerService:        "EmployeeService",
		ValueShape:          "models.EmployeeContext",
		SerializationFormat: FormatJSON,
		DefaultTTL:          15 * time.Minute,
		JitterRange:         2 * time.Minute,
		NegativeCacheTTL:    0,
		Scope:               ScopeUser,
		InvalidationEvents:  []string{"employee_update", "employee_activate", "employee_deactivate", "employee_terminate", "role_change"},
		FallbackBehavior:    "PostgreSQL EmployeeRepository via singleflight with strict status validation",
	},
}

func AuthTokenKey(tokenHash string) string {
	return fmt.Sprintf("radius:v1:auth:token:%s", strings.TrimSpace(tokenHash))
}

func CatalogProductKey(productId int) string {
	return fmt.Sprintf("radius:v1:catalog:product:%d", productId)
}

func CatalogBarcodeKey(barcode string) string {
	return fmt.Sprintf("radius:v1:catalog:barcode:%s", strings.ToUpper(strings.TrimSpace(barcode)))
}

func CatalogCategoriesKey() string {
	return "radius:v1:catalog:categories"
}

func CatalogBrandsKey() string {
	return "radius:v1:catalog:brands"
}

func InventoryProductKey(storeId int, productId int) string {
	return fmt.Sprintf("radius:v1:inventory:store:%d:product:%d", storeId, productId)
}

func InventoryStorePattern(storeId int) string {
	return fmt.Sprintf("radius:v1:inventory:store:%d:*", storeId)
}

func IS4TCStoreKey(storeId int) string {
	return fmt.Sprintf("radius:v1:is4tc:store:%d", storeId)
}

func StoreDirectoryKey(page int, pageSize int) string {
	return fmt.Sprintf("radius:v1:store:directory:%d:%d", page, pageSize)
}

func StoreDirectoryPattern() string {
	return "radius:v1:store:directory:*"
}

func StoreOperationsKey(storeId int) string {
	return fmt.Sprintf("radius:v1:store:operations:%d", storeId)
}

func StoreOperationsGlobalKey() string {
	return "radius:v1:store:operations:all"
}

func EmployeeKey(employeeId int) string {
	return fmt.Sprintf("radius:v1:employee:%d", employeeId)
}

func LegacyAuthTokenKey(tokenHash string) string {
	return "session:" + strings.TrimSpace(tokenHash)
}

func LegacyCatalogProductKey(productId int) string {
	return fmt.Sprintf("product:%d", productId)
}

func LegacyCatalogCategoriesKey() string {
	return "categories:all"
}

func LegacyCatalogBrandsKey() string {
	return "brands:distinct"
}

func LegacyInventoryBarcodeKey(storeId int, barcode string) string {
	return fmt.Sprintf("inventory:%d:barcode:%s", storeId, strings.ToUpper(strings.TrimSpace(barcode)))
}

func LegacyInventoryStorePattern(storeId int) string {
	return fmt.Sprintf("inventory:%d:*", storeId)
}

func LegacyIS4TCKey(storeId int) string {
	return fmt.Sprintf("is4tc_session:%d", storeId)
}

func LegacyStoreOperationsKey() string {
	return "radius:v1:store:ops"
}

func ApplyJitter(baseTTL time.Duration, jitterRange time.Duration) time.Duration {
	if jitterRange <= 0 {
		return baseTTL
	}
	n, err := rand.Int(rand.Reader, big.NewInt(int64(jitterRange)))
	if err != nil {
		return baseTTL
	}
	return baseTTL + time.Duration(n.Int64())
}

func InvalidateStoreOperations(ctx context.Context, rdb *redis.Client, storeId ...int) {
	if rdb == nil {
		return
	}
	keys := []string{
		StoreOperationsGlobalKey(),
		LegacyStoreOperationsKey(),
	}
	if len(storeId) > 0 && storeId[0] > 0 {
		keys = append(keys, StoreOperationsKey(storeId[0]))
	}
	_ = rdb.Del(ctx, keys...).Err()
}

func InvalidateProduct(ctx context.Context, rdb *redis.Client, productID int, barcode ...string) {
	if rdb == nil {
		return
	}
	keys := []string{
		CatalogProductKey(productID),
		LegacyCatalogProductKey(productID),
	}
	for _, b := range barcode {
		if strings.TrimSpace(b) != "" {
			keys = append(keys, CatalogBarcodeKey(b))
		}
	}
	_ = rdb.Del(ctx, keys...).Err()
}

func InvalidateCategories(ctx context.Context, rdb *redis.Client) {
	if rdb == nil {
		return
	}
	_ = rdb.Del(ctx, CatalogCategoriesKey(), LegacyCatalogCategoriesKey()).Err()
}

func InvalidateBrands(ctx context.Context, rdb *redis.Client) {
	if rdb == nil {
		return
	}
	_ = rdb.Del(ctx, CatalogBrandsKey(), LegacyCatalogBrandsKey()).Err()
}
