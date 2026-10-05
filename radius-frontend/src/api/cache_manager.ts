export type CachePolicy = "no-store" | "cache-first" | "swr" | "network-first";

export interface CacheEntry<T = any> {
    data: T;
    timestamp: number;
    generation: number;
}

export interface ETagEntry<T = any> {
    etag: string;
    data: T;
    generation: number;
}

let clientStoreId: number | null = null;
let clientEmployeeId: number | null = null;
let sessionGeneration = 0;

export function setClientContext(context: { storeId?: number | null; employeeId?: number | null }): void {
    if (context.storeId !== undefined) clientStoreId = context.storeId;
    if (context.employeeId !== undefined) clientEmployeeId = context.employeeId;
}

export function resetClientContext(): void {
    clientStoreId = null;
    clientEmployeeId = null;
    clearSWRCache();
}

export function getSessionGeneration(): number {
    return sessionGeneration;
}

export function getClientContext(): { storeId: number | null; employeeId: number | null } {
    return { storeId: clientStoreId, employeeId: clientEmployeeId };
}

export function buildCacheKey(method: string, path: string): string {
    const isAbsolute = path.startsWith("http://") || path.startsWith("https://");
    const url = new URL(isAbsolute ? path : `http://localhost${path}`);
    const sortedEntries = Array.from(url.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b));
    const normalizedQuery = sortedEntries.map(([k, v]) => `${k}=${v}`).join("&");
    const storeScope = clientStoreId !== null ? `s:${clientStoreId}` : "s:none";
    const userScope = clientEmployeeId !== null ? `u:${clientEmployeeId}` : "u:none";
    return `${method.toUpperCase()}:${url.pathname}:${normalizedQuery}:${storeScope}:${userScope}`;
}

export const MAX_CACHE_ENTRIES = 100;
export const swrCache = new Map<string, CacheEntry>();
export const etagStore = new Map<string, ETagEntry>();
export const inFlightRequests = new Map<string, Promise<any>>();

const cacheSubscribers = new Map<string, Set<(data: any) => void>>();

export function subscribeCache<T>(key: string, callback: (data: T) => void): () => void {
    let subscribers = cacheSubscribers.get(key);
    if (!subscribers) {
        subscribers = new Set();
        cacheSubscribers.set(key, subscribers);
    }
    subscribers.add(callback as (data: any) => void);
    return () => {
        const current = cacheSubscribers.get(key);
        if (!current) return;
        current.delete(callback as (data: any) => void);
        if (current.size === 0) {
            cacheSubscribers.delete(key);
        }
    };
}

export function notifyCacheUpdate<T>(key: string, data: T): void {
    const subscribers = cacheSubscribers.get(key);
    if (!subscribers) return;
    for (const callback of subscribers) {
        callback(data);
    }
}

export function setWithEviction<K, V>(map: Map<K, V>, key: K, value: V, maxEntries = MAX_CACHE_ENTRIES): void {
    if (map.size >= maxEntries) {
        const oldestKey = map.keys().next().value;
        if (oldestKey !== undefined) {
            map.delete(oldestKey);
        }
    }
    map.set(key, value);
}

export function clearSWRCache(prefixOrKey?: string): void {
    if (!prefixOrKey) {
        sessionGeneration++;
        swrCache.clear();
        etagStore.clear();
        inFlightRequests.clear();
        return;
    }
    for (const key of swrCache.keys()) {
        if (key.includes(prefixOrKey)) {
            swrCache.delete(key);
        }
    }
    for (const key of etagStore.keys()) {
        if (key.includes(prefixOrKey)) {
            etagStore.delete(key);
        }
    }
}
