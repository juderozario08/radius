import { getToken, saveToken, saveRefreshToken, getRefreshToken, deleteToken, deleteRefreshToken } from "@/utils/token";
import { ENDPOINTS } from "@/constants/routes";
import { RefreshTokenResponse } from "@/types/auth.types";
import { logger } from "@/utils/logger";
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
    logger.warn("Missing EXPO_PUBLIC_API_URL in .env file");
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

export class TimeoutError extends Error {
    constructor() {
        super("Request timed out. Check your connection and try again.");
        this.name = "TimeoutError";
    }
}

export interface FetchOptions extends RequestInit {
    cachePolicy?: CachePolicy;
}

let refreshPromise: Promise<string | null> | null = null;

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, 15000);
    const callerSignal = options.signal;
    const abortCaller = () => controller.abort();
    if (callerSignal?.aborted) controller.abort();
    callerSignal?.addEventListener("abort", abortCaller, { once: true });
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (err) {
        if (timedOut) throw new TimeoutError();
        throw err;
    } finally {
        clearTimeout(timeout);
        callerSignal?.removeEventListener("abort", abortCaller);
    }
}

async function requestNewTokens(): Promise<string | null> {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
        return null;
    }

    const response = await fetchWithTimeout(`${BASE_URL}${ENDPOINTS.AUTH.refreshToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (response.status === 401 || response.status === 403) {
        await deleteToken();
        await deleteRefreshToken();
        return null;
    }

    if (!response.ok) {
        throw new Error("Couldn't renew your session. Try again.");
    }

    const data = (await response.json()) as RefreshTokenResponse;
    await saveToken(data.token);
    if (data.refresh_token) {
        await saveRefreshToken(data.refresh_token);
    }
    return data.token;
}

// The backend rotates refresh tokens and terminates the whole session when a used one is replayed,
// so every 401 must share one refresh, and a 401 for a token that was already replaced just retries.
async function refreshAccessToken(rejectedToken: string | null): Promise<string | null> {
    if (refreshPromise) {
        return refreshPromise;
    }
    const currentToken = await getToken();
    if (currentToken && currentToken !== rejectedToken) {
        return currentToken;
    }
    refreshPromise ??= requestNewTokens().finally(() => {
        refreshPromise = null;
    });
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
        const newToken = await refreshAccessToken(token);
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
