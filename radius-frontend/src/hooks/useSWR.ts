import { useCallback, useEffect, useState } from "react";
import { buildCacheKey, subscribeCache } from "@/api/client";
import { callApi } from "@/utils/helpers";
import { useAuth } from "./useAuth";

export function useSWR<T>(endpoint: string | null) {
    const { logout } = useAuth();
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(!!endpoint);

    const refetch = useCallback(async (): Promise<T | null> => {
        if (!endpoint) return null;
        const result = await callApi<T>(endpoint, { method: "GET", swr: true }, logout);
        if (result !== null) setData(result);
        return result;
    }, [endpoint, logout]);

    useEffect(() => {
        if (!endpoint) {
            setData(null);
            setIsLoading(false);
            return;
        }

        let active = true;
        const key = buildCacheKey("GET", endpoint);
        const unsubscribe = subscribeCache<T>(key, (fresh) => {
            if (active) setData(fresh);
        });

        setIsLoading(true);
        callApi<T>(endpoint, { method: "GET", swr: true }, logout)
            .then((result) => {
                if (active && result !== null) setData(result);
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });

        return () => {
            active = false;
            unsubscribe();
        };
    }, [endpoint, logout]);

    return { data, isLoading, refetch, setData };
}
