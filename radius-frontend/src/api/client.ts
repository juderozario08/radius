import { getToken } from "@/utils/token";
import * as SecureStore from "expo-secure-store";

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
        await SecureStore.deleteItemAsync("session_token");
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
