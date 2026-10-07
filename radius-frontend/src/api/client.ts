import { getToken, saveToken, saveRefreshToken, getRefreshToken, deleteToken, deleteRefreshToken } from "@/utils/token";
import { ENDPOINTS } from "@/constants/routes";
import { RefreshTokenResponse } from "@/types/auth.types";
import {
    CachePolicy,
    setClientContext,
    resetClientContext,
    getSessionGeneration,
    buildCacheKey,
    swrCache,
    etagStore,
    inFlightRequests,
    setWithEviction,
    clearSWRCache,
    subscribeCache,
    notifyCacheUpdate,
} from "./cache_manager";

export type { CachePolicy };
export {
    setClientContext,
    resetClientContext,
    getSessionGeneration,
    buildCacheKey,
    clearSWRCache,
    subscribeCache,
};

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!BASE_URL) {
    console.warn("Missing EXPO_PUBLIC_API_URL in .env file");
}

export class ConflictError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ConflictError";
    }
}

export class UnauthorizedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UnauthorizedError";
    }
}

export interface FetchOptions extends RequestInit {
    cachePolicy?: CachePolicy;
}

let refreshPromise: Promise<string | null> | null = null;

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const callerSignal = options.signal;
    const abortCaller = () => controller.abort();
    if (callerSignal?.aborted) controller.abort();
    callerSignal?.addEventListener("abort", abortCaller, { once: true });
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeout);
        callerSignal?.removeEventListener("abort", abortCaller);
    }
}

async function refreshAccessToken(): Promise<string | null> {
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        try {
            const refreshToken = await getRefreshToken();
            if (!refreshToken) {
                return null;
            }

            const response = await fetchWithTimeout(`${BASE_URL}${ENDPOINTS.AUTH.refreshToken}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refresh_token: refreshToken }),
            });

            if (!response.ok) {
                await deleteToken();
                await deleteRefreshToken();
                return null;
            }

            const data = (await response.json()) as RefreshTokenResponse;
            await saveToken(data.token);
            if (data.refresh_token) {
                await saveRefreshToken(data.refresh_token);
            }
            return data.token;
        } catch {
            await deleteToken();
            await deleteRefreshToken();
            return null;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

async function executeNetworkFetch<T>(
    path: string,
    options: FetchOptions | undefined,
    cacheKey: string,
    method: string,
    useETag: boolean,
): Promise<T> {
    const token = await getToken();
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers as Record<string, string> | undefined),
    };

    const cachedEtag = useETag ? etagStore.get(cacheKey) : undefined;
    if (method === "GET" && cachedEtag) {
        headers["If-None-Match"] = cachedEtag.etag;
    }

    let response = await fetchWithTimeout(`${BASE_URL}${path}`, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        const newToken = await refreshAccessToken();
        if (!newToken) {
            throw new UnauthorizedError("Invalid or expired session");
        }
        response = await fetchWithTimeout(`${BASE_URL}${path}`, {
            ...options,
            headers: { ...headers, Authorization: `Bearer ${newToken}` },
        });
    }

    if (response.status === 304 && cachedEtag) {
        return cachedEtag.data as T;
    }

    if (response.status === 401) {
        throw new UnauthorizedError("Invalid or expired session");
    }

    if (response.status === 409) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new ConflictError(body?.error || "Conflict");
    }

    if (!response.ok) {
        let errorMessage = "An unexpected error occurred";
        try {
            const errorBody = await response.json();
            errorMessage = errorBody.error || errorMessage;
        } catch {}
        throw new Error(errorMessage);
    }

    const data = (await response.json()) as T;
    const etagHeader = response.headers.get("etag") || response.headers.get("ETag");
    if (useETag && etagHeader && method === "GET") {
        setWithEviction(etagStore, cacheKey, { etag: etagHeader, data, generation: getSessionGeneration() });
    }
    return data;
}

export async function apiFetch<T>(
    path: string,
    options?: FetchOptions,
): Promise<T> {
    const method = (options?.method || "GET").toUpperCase();
    const cachePolicy: CachePolicy = method !== "GET" ? "no-store" : (options?.cachePolicy || "network-first");

    if (cachePolicy === "no-store") {
        return executeNetworkFetch<T>(path, options, "", method, false);
    }

    const cacheKey = buildCacheKey(method, path);

    if (cachePolicy === "cache-first") {
        const cached = swrCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < 10 * 60 * 1000) && cached.generation === getSessionGeneration()) {
            return cached.data as T;
        }
    }

    if (cachePolicy === "swr") {
        const cached = swrCache.get(cacheKey);
        const currentGeneration = getSessionGeneration();
        if (cached && cached.generation === currentGeneration) {
            const isStale = (Date.now() - cached.timestamp > 5 * 60 * 1000);
            if (isStale) {
                executeNetworkFetch<T>(path, options, cacheKey, method, true)
                    .then((data) => {
                        if (getSessionGeneration() === currentGeneration) {
                            setWithEviction(swrCache, cacheKey, { data, timestamp: Date.now(), generation: currentGeneration });
                            notifyCacheUpdate(cacheKey, data);
                        }
                    })
                    .catch(() => {});
            }
            return cached.data as T;
        }
    }

    const inFlight = inFlightRequests.get(cacheKey);
    if (inFlight) {
        return inFlight as Promise<T>;
    }

    const requestPromise = (async () => {
        try {
            const data = await executeNetworkFetch<T>(path, options, cacheKey, method, true);
            setWithEviction(swrCache, cacheKey, { data, timestamp: Date.now(), generation: getSessionGeneration() });
            return data;
        } catch (err) {
            if (cachePolicy === "network-first") {
                const cached = swrCache.get(cacheKey);
                if (cached && cached.generation === getSessionGeneration()) {
                    return cached.data as T;
                }
                const cachedEtag = etagStore.get(cacheKey);
                if (cachedEtag && cachedEtag.generation === getSessionGeneration()) {
                    return cachedEtag.data as T;
                }
            }
            throw err;
        }
    })();

    inFlightRequests.set(cacheKey, requestPromise);
    try {
        return await requestPromise;
    } finally {
        inFlightRequests.delete(cacheKey);
    }
}

export async function apiFetchSWR<T>(
    path: string,
    options?: FetchOptions,
): Promise<T> {
    return apiFetch<T>(path, { ...options, cachePolicy: "swr" });
}
