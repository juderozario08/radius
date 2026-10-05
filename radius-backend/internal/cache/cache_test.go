package cache_test

import (
	"radius/internal/cache"
	"testing"
	"time"
)

func TestCacheKeys_FormatAndNormalization(t *testing.T) {
	if got := cache.AuthTokenKey("abc123hash"); got != "radius:v1:auth:token:abc123hash" {
		t.Fatalf("unexpected AuthTokenKey: %s", got)
	}
	if got := cache.LegacyAuthTokenKey("abc123hash"); got != "session:abc123hash" {
		t.Fatalf("unexpected LegacyAuthTokenKey: %s", got)
	}

	if got := cache.CatalogProductKey(42); got != "radius:v1:catalog:product:42" {
		t.Fatalf("unexpected CatalogProductKey: %s", got)
	}
	if got := cache.LegacyCatalogProductKey(42); got != "product:42" {
		t.Fatalf("unexpected LegacyCatalogProductKey: %s", got)
	}

	if got := cache.CatalogBarcodeKey("  0123-abc  "); got != "radius:v1:catalog:barcode:0123-ABC" {
		t.Fatalf("unexpected CatalogBarcodeKey: %s", got)
	}

	if got := cache.CatalogCategoriesKey(); got != "radius:v1:catalog:categories" {
		t.Fatalf("unexpected CatalogCategoriesKey: %s", got)
	}
	if got := cache.LegacyCatalogCategoriesKey(); got != "categories:all" {
		t.Fatalf("unexpected LegacyCatalogCategoriesKey: %s", got)
	}

	if got := cache.CatalogBrandsKey(); got != "radius:v1:catalog:brands" {
		t.Fatalf("unexpected CatalogBrandsKey: %s", got)
	}
	if got := cache.LegacyCatalogBrandsKey(); got != "brands:distinct" {
		t.Fatalf("unexpected LegacyCatalogBrandsKey: %s", got)
	}

	if got := cache.InventoryProductKey(3, 105); got != "radius:v1:inventory:store:3:product:105" {
		t.Fatalf("unexpected InventoryProductKey: %s", got)
	}
	if got := cache.LegacyInventoryBarcodeKey(3, "upc123"); got != "inventory:3:barcode:UPC123" {
		t.Fatalf("unexpected LegacyInventoryBarcodeKey: %s", got)
	}

	if got := cache.IS4TCStoreKey(7); got != "radius:v1:is4tc:store:7" {
		t.Fatalf("unexpected IS4TCStoreKey: %s", got)
	}
	if got := cache.LegacyIS4TCKey(7); got != "is4tc_session:7" {
		t.Fatalf("unexpected LegacyIS4TCKey: %s", got)
	}

	if got := cache.StoreDirectoryKey(2, 25); got != "radius:v1:store:directory:2:25" {
		t.Fatalf("unexpected StoreDirectoryKey: %s", got)
	}
	if got := cache.StoreOperationsKey(4); got != "radius:v1:store:operations:4" {
		t.Fatalf("unexpected StoreOperationsKey: %s", got)
	}

	if got := cache.EmployeeKey(88); got != "radius:v1:employee:88" {
		t.Fatalf("unexpected EmployeeKey: %s", got)
	}
}

func TestApplyJitter(t *testing.T) {
	baseTTL := 10 * time.Minute
	jitterRange := 60 * time.Second

	for i := 0; i < 50; i++ {
		jittered := cache.ApplyJitter(baseTTL, jitterRange)
		if jittered < baseTTL || jittered > baseTTL+jitterRange {
			t.Fatalf("jittered TTL %v outside bounds [%v, %v]", jittered, baseTTL, baseTTL+jitterRange)
		}
	}

	if got := cache.ApplyJitter(baseTTL, 0); got != baseTTL {
		t.Fatalf("expected exact baseTTL with 0 jitter, got %v", got)
	}
}

func TestCacheMetadataRegistry(t *testing.T) {
	expectedFamilies := []string{
		"auth:token",
		"catalog:product",
		"catalog:barcode",
		"catalog:categories",
		"catalog:brands",
		"inventory:store:product",
		"is4tc:store",
		"store:directory",
		"store:operations",
		"employee:context",
	}

	for _, family := range expectedFamilies {
		meta, exists := cache.Registry[family]
		if !exists {
			t.Fatalf("missing cache family in registry: %s", family)
		}
		if meta.DefaultTTL <= 0 {
			t.Fatalf("invalid TTL for family %s: %v", family, meta.DefaultTTL)
		}
		if meta.OwnerService == "" {
			t.Fatalf("empty owner service for family: %s", family)
		}
	}
}
