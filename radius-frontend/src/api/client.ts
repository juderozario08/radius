import { getToken, saveToken, saveRefreshToken, getRefreshToken, deleteToken, deleteRefreshToken } from "@/utils/token";
import { ENDPOINTS } from "@/constants/routes";
import { RefreshTokenResponse } from "@/types/auth.types";
import { logger } from "@/utils/logger";
import {
    CachePolicy,
    InFlightRequest,
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

function createAbortError(reason?: unknown): Error {
    if (reason instanceof Error) {
        return reason;
    }
    if (typeof DOMException !== "undefined") {
        try {
            return new DOMException(typeof reason === "string" ? reason : "The operation was aborted", "AbortError");
        } catch {}
    }
    const err = new Error(typeof reason === "string" ? reason : "Aborted");
    err.name = "AbortError";
    return err;
}

interface ManagedResponse extends Response {
    cleanup?: () => void;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<ManagedResponse> {
    const controller = new AbortController();
    let timedOut = false;
    let cleanedUp = false;
    const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, 15000);
    const callerSignal = options.signal;
    const abortCaller = () => controller.abort();
    if (callerSignal?.aborted) {
        controller.abort();
    } else {
        callerSignal?.addEventListener("abort", abortCaller, { once: true });
    }

    const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        clearTimeout(timeout);
        callerSignal?.removeEventListener("abort", abortCaller);
    };

    try {
        const response = (await fetch(url, { ...options, signal: controller.signal })) as ManagedResponse;
        if (typeof response.json === "function") {
            const originalJson = response.json.bind(response);
            response.json = async () => {
                try {
                    return await originalJson();
                } catch (err) {
                    if (timedOut) throw new TimeoutError();
                    throw err;
                } finally {
                    cleanup();
                }
            };
        }
        response.cleanup = cleanup;
        return response;
    } catch (err) {
        cleanup();
        if (timedOut) throw new TimeoutError();
        throw err;
    }
}

async function requestNewTokens(): Promise<string | null> {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
        return null;
    }

    let response: ManagedResponse | null = null;
    try {
        response = await fetchWithTimeout(`${BASE_URL}${ENDPOINTS.AUTH.refreshToken}`, {
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
    } finally {
        response?.cleanup?.();
    }
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

    let response: ManagedResponse | null = null;
    try {
        response = await fetchWithTimeout(`${BASE_URL}${path}`, {
            ...options,
            headers,
        });

        if (response.status === 401) {
            response.cleanup?.();
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
    } finally {
        response?.cleanup?.();
    }
}

function createInFlightRequest<T>(
    run: (signal: AbortSignal) => Promise<T>,
    onComplete: () => void,
): InFlightRequest<T> {
    const controller = new AbortController();
    let subscriberCount = 0;
    const sharedPromise = run(controller.signal);

    const subscribe = (signal?: AbortSignal | null): Promise<T> => {
        if (signal?.aborted) {
            return Promise.reject(createAbortError(signal.reason));
        }

        subscriberCount++;

        return new Promise<T>((resolve, reject) => {
            let settled = false;

            const onAbort = () => {
                if (settled) return;
                settled = true;
                signal?.removeEventListener("abort", onAbort);
                subscriberCount--;
                if (subscriberCount <= 0) {
                    controller.abort();
                }
                reject(createAbortError(signal?.reason));
            };

            if (signal) {
                signal.addEventListener("abort", onAbort, { once: true });
            }

            sharedPromise
                .then((data) => {
                    if (settled) return;
                    settled = true;
                    signal?.removeEventListener("abort", onAbort);
                    resolve(data);
                })
                .catch((err) => {
                    if (settled) return;
                    settled = true;
                    signal?.removeEventListener("abort", onAbort);
                    reject(err);
                });
        });
    };

    sharedPromise.finally(onComplete).catch(() => {});

    return { sharedPromise, subscribe };
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

    const inFlight = inFlightRequests.get(cacheKey) as InFlightRequest<T> | undefined;
    if (inFlight) {
        return inFlight.subscribe(options?.signal);
    }

    const inFlightEntry = createInFlightRequest<T>(
        (sharedSignal) => (async () => {
            try {
                const data = await executeNetworkFetch<T>(path, { ...options, signal: sharedSignal }, cacheKey, method, true);
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
        })(),
        () => {
            inFlightRequests.delete(cacheKey);
        },
    );

    inFlightRequests.set(cacheKey, inFlightEntry as InFlightRequest<unknown>);
    return inFlightEntry.subscribe(options?.signal);
}

export async function apiFetchSWR<T>(
    path: string,
    options?: FetchOptions,
): Promise<T> {
    return apiFetch<T>(path, { ...options, cachePolicy: "swr" });
}
