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

export async function apiFetch<T>(
    path: string,
    options?: RequestInit,
): Promise<T> {
    const token = await getToken();

    const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options?.headers,
        },
    });

    if (response.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
            const retryResponse = await fetch(`${BASE_URL}${path}`, {
                ...options,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${newToken}`,
                    ...options?.headers,
                },
            });

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

            return retryResponse.json() as Promise<T>;
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

    return response.json() as Promise<T>;
}
