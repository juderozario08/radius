import { apiFetch, apiFetchSWR, clearSWRCache, UnauthorizedError } from "@/api/client";
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
    swr?: boolean;
    signal?: AbortSignal;
}

function invalidateCachesForMutation(endpoint: string) {
    if (endpoint.includes("/transfers") || endpoint.includes("/receiving")) {
        clearSWRCache("/transfers");
        clearSWRCache("/receiving");
        clearSWRCache("/inventory");
    } else if (endpoint.includes("/inventory")) {
        clearSWRCache("/inventory");
    } else if (endpoint.includes("/products")) {
        clearSWRCache("/products");
        clearSWRCache("/catalog");
    } else if (endpoint.includes("/categories") || endpoint.includes("/brands")) {
        clearSWRCache("/categories");
        clearSWRCache("/brands");
    } else if (endpoint.includes("/stores")) {
        clearSWRCache("/stores");
    } else if (endpoint.includes("/employees") || endpoint.includes("/sessions")) {
        clearSWRCache("/employees");
        clearSWRCache("/sessions");
    } else if (endpoint.includes("/returns") || endpoint.includes("/transactions")) {
        clearSWRCache("/inventory");
        clearSWRCache("/transactions");
    }
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
        let result: T;
        if (options?.swr && (!options.method || options.method === "GET")) {
            result = await apiFetchSWR<T>(endpoint, {
                method,
                body,
                signal: options?.signal,
            });
        } else {
            result = await apiFetch<T>(endpoint, {
                method,
                body,
                signal: options?.signal,
            });
        }

        if (method !== "GET" && method !== "HEAD") {
            invalidateCachesForMutation(endpoint);
        }

        return result;
    } catch (err: any) {
        if (err?.name === "AbortError" || options?.signal?.aborted) {
            return null;
        }
        const errorMessage = err instanceof Error ? err.message : String(err);
        showToast("error", errorMessage);
        if (err instanceof UnauthorizedError) {
            await logout();
        }
        return null;
    }
}
