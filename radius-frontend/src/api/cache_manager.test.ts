import test from "node:test";
import assert from "node:assert/strict";
import {
    buildCacheKey,
    setClientContext,
    resetClientContext,
    getSessionGeneration,
    setWithEviction,
    clearSWRCache,
    swrCache,
} from "./cache_manager.ts";

test("buildCacheKey normalizes query parameters regardless of parameter order", () => {
    resetClientContext();
    const key1 = buildCacheKey("GET", "/api/products?category=1&search=apple");
    const key2 = buildCacheKey("GET", "/api/products?search=apple&category=1");
    assert.equal(key1, key2);
});

test("buildCacheKey isolates requests by store ID", () => {
    resetClientContext();
    setClientContext({ storeId: 10 });
    const keyStore1 = buildCacheKey("GET", "/api/store/summary");

    setClientContext({ storeId: 20 });
    const keyStore2 = buildCacheKey("GET", "/api/store/summary");

    assert.notEqual(keyStore1, keyStore2);
    assert.match(keyStore1, /:s:10:/);
    assert.match(keyStore2, /:s:20:/);
});

test("buildCacheKey isolates requests by employee ID", () => {
    resetClientContext();
    setClientContext({ employeeId: 42 });
    const keyUser1 = buildCacheKey("GET", "/api/profile");

    setClientContext({ employeeId: 99 });
    const keyUser2 = buildCacheKey("GET", "/api/profile");

    assert.notEqual(keyUser1, keyUser2);
    assert.match(keyUser1, /:u:42$/);
    assert.match(keyUser2, /:u:99$/);
});

test("resetClientContext increments generation and clears scope", () => {
    setClientContext({ storeId: 1, employeeId: 2 });
    const genBefore = getSessionGeneration();

    resetClientContext();
    const genAfter = getSessionGeneration();

    assert.equal(genAfter, genBefore + 1);
    const key = buildCacheKey("GET", "/api/status");
    assert.match(key, /:s:none:u:none$/);
});

test("setWithEviction bounds cache size by evicting oldest item", () => {
    const testMap = new Map<string, number>();
    const maxEntries = 3;

    setWithEviction(testMap, "k1", 1, maxEntries);
    setWithEviction(testMap, "k2", 2, maxEntries);
    setWithEviction(testMap, "k3", 3, maxEntries);
    assert.equal(testMap.size, 3);

    setWithEviction(testMap, "k4", 4, maxEntries);
    assert.equal(testMap.size, 3);
    assert.equal(testMap.has("k1"), false);
    assert.equal(testMap.has("k4"), true);
});

test("clearSWRCache invalidates all or prefixed entries", () => {
    resetClientContext();
    swrCache.set("GET:/api/products:all", { data: [1], timestamp: Date.now(), generation: 0 });
    swrCache.set("GET:/api/categories:all", { data: [2], timestamp: Date.now(), generation: 0 });

    clearSWRCache("/api/products");
    assert.equal(swrCache.has("GET:/api/products:all"), false);
    assert.equal(swrCache.has("GET:/api/categories:all"), true);

    clearSWRCache();
    assert.equal(swrCache.size, 0);
});
