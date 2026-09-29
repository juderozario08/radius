import { getToken, saveToken, getRefreshToken, deleteToken, deleteRefreshToken } from "@/utils/token";
import { ENDPOINTS } from "@/constants/routes";
import { RefreshTokenResponse } from "@/types/auth.types";

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

let refreshPromise: Promise<string | null> | null = null;

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

            const response = await fetch(`${BASE_URL}${ENDPOINTS.AUTH.refreshToken}`, {
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

interface ETagCacheEntry {
    etag: string;
    data: any;
}

const etagCache = new Map<string, ETagCacheEntry>();

export function clearETagCache(prefixOrKey?: string): void {
    if (!prefixOrKey) {
        etagCache.clear();
        return;
    }
    for (const key of etagCache.keys()) {
        if (key.startsWith(prefixOrKey)) {
            etagCache.delete(key);
        }
    }
}

export async function apiFetch<T>(
    path: string,
    options?: RequestInit,
): Promise<T> {
    const isGet = !options?.method || options.method.toUpperCase() === "GET";
    const cachedEntry = isGet ? etagCache.get(path) : undefined;

    const token = await getToken();

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    if (cachedEntry?.etag) {
        headers["If-None-Match"] = cachedEntry.etag;
    }

    if (options?.headers) {
        if (options.headers instanceof Headers) {
            options.headers.forEach((value, key) => {
                headers[key] = value;
            });
        } else if (Array.isArray(options.headers)) {
            options.headers.forEach(([key, value]) => {
                headers[key] = value;
            });
        } else {
            Object.assign(headers, options.headers);
        }
    }

    const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
    });

    if (response.status === 304 && cachedEntry) {
        return cachedEntry.data as T;
    }

    if (response.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
            const retryHeaders = {
                ...headers,
                Authorization: `Bearer ${newToken}`,
            };

            const retryResponse = await fetch(`${BASE_URL}${path}`, {
                ...options,
                headers: retryHeaders,
            });

            if (retryResponse.status === 304 && cachedEntry) {
                return cachedEntry.data as T;
            }

            if (retryResponse.status === 401) {
                throw new UnauthorizedError("Invalid or expired session");
            }

            if (retryResponse.status === 409) {
                throw new ConflictError("already_logged_in");
            }

            if (!retryResponse.ok) {
                let errorMessage = "An unexpected error occurred";
                try {
                    const errorBody = await retryResponse.json();
                    errorMessage = errorBody.error || errorMessage;
                } catch (e) { }
                throw new Error(errorMessage);
            }

            const data = (await retryResponse.json()) as T;
            if (isGet) {
                const etag = retryResponse.headers.get("etag") || retryResponse.headers.get("ETag");
                if (etag) {
                    etagCache.set(path, { etag, data });
                }
            }
            return data;
        }

        throw new UnauthorizedError("Invalid or expired session");
    }

    if (response.status === 409) {
        throw new ConflictError("already_logged_in");
    }

    if (!response.ok) {
        let errorMessage = "An unexpected error occurred";
        try {
            const errorBody = await response.json();
            errorMessage = errorBody.error || errorMessage;
        } catch (e) { }
        throw new Error(errorMessage);
    }

    const data = (await response.json()) as T;
    if (isGet) {
        const etag = response.headers.get("etag") || response.headers.get("ETag");
        if (etag) {
            etagCache.set(path, { etag, data });
        }
    }
    return data;
}

const swrCache = new Map<string, { data: any; timestamp: number }>();

export function clearSWRCache(prefixOrKey?: string): void {
    if (!prefixOrKey) {
        swrCache.clear();
        etagCache.clear();
        return;
    }
    for (const key of swrCache.keys()) {
        if (key.startsWith(prefixOrKey)) {
            swrCache.delete(key);
        }
    }
    for (const key of etagCache.keys()) {
        if (key.startsWith(prefixOrKey)) {
            etagCache.delete(key);
        }
    }
}

export async function apiFetchSWR<T>(
    path: string,
    options?: RequestInit,
): Promise<T> {
    const cacheKey = path;
    const cached = swrCache.get(cacheKey);
    const isStale = !cached || (Date.now() - cached.timestamp > 5 * 60 * 1000);

    if (cached) {
        if (isStale) {
            apiFetch<T>(path, options)
                .then((data) => {
                    swrCache.set(cacheKey, { data, timestamp: Date.now() });
                })
                .catch(() => {});
        }
        return cached.data as T;
    }

    const data = await apiFetch<T>(path, options);
    swrCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
}
