//radius-frontend/src/utils/helpers.ts
import { apiFetch, UnauthorizedError } from "@/api/client";
import Toast from "react-native-toast-message";

export function capitalize(value: string): string {
    if (!value) return value;
    return value.charAt(0) + value.slice(1).toLowerCase();
}

export function showToast(type: "success" | "error", text: string) {
    Toast.show({ type, text1: text, position: "bottom", visibilityTime: 1000 });
}

export async function callApi<T>(endpoint: string, options: { method: string; body?: any }, logout: () => Promise<void>): Promise<T | null> {
    try {
        return await apiFetch<T>(endpoint, {
            method: options.method,
            body: options.body ? JSON.stringify(options.body) : undefined,
        });
    } catch (err) {
        showToast("error", String(err));
        if (err instanceof UnauthorizedError) {
            await logout();
        }
        return null;
    }
}

