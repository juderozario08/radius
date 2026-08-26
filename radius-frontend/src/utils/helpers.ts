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

export interface ApiCallOptions {
    method?: string;
    body?: any;
}

export async function callApi<T>(
    endpoint: string,
    options: ApiCallOptions = { method: "GET" },
    logout: () => Promise<void>
): Promise<T | null> {
    const method = options?.method || "GET";
    const body = options?.body
        ? typeof options.body === "string"
            ? options.body
            : JSON.stringify(options.body)
        : undefined;

    try {
        return await apiFetch<T>(endpoint, {
            method,
            body,
        });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.log(`API Call Failed [${method} ${endpoint}]: ${errorMessage}`);
        showToast("error", errorMessage);
        if (err instanceof UnauthorizedError) {
            await logout();
        }
        return null;
    }
}

