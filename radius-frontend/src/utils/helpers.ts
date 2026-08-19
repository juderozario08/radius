//radius-frontend/src/utils/helpers.ts
import { apiFetch, UnauthorizedError } from "@/api/client";
import Toast from "react-native-toast-message";

export function capitalize(value: string): string {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function showToast(type: "success" | "error" | "info", text: string) {
    Toast.show({ type, text1: text, position: "bottom", visibilityTime: 3000 });
}

export async function callApi<T>(endpoint: string, options: { method: string; body?: any }, logout: () => Promise<void>): Promise<T | null> {
    try {
        return await apiFetch<T>(endpoint, {
            method: options.method,
            body: options.body ? JSON.stringify(options.body) : undefined,
        });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.log(`API Call Failed [${options.method} ${endpoint}]: ${errorMessage}`);
        showToast("error", errorMessage);
        if (err instanceof UnauthorizedError) {
            await logout();
        }
        return null;
    }
}

