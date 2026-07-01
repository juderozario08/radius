import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!BASE_URL) {
    console.warn("Missing EXPO_PUBLIC_API_URL in .env file");
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const token = await SecureStore.getItemAsync('session_token');

    const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options?.headers,
        },
    });

    if (response.status === 401) {
        await SecureStore.deleteItemAsync('session_token');
    }

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? 'An unexpected error occurred');
    }

    return response.json() as Promise<T>;
}
