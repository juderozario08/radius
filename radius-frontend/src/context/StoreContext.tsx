import { apiFetch, clearSWRCache, setClientContext } from "@/api/client";
import { ENDPOINTS } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { GetStoreResponse, Store } from "@/types/admin.types";
import { hasPermission } from "@/utils/roles";
import { createContext, ReactNode, useCallback, useEffect, useState } from "react";

type StoreContextType = {
    store: Store | null;
    isLoading: boolean;
    error: string | null;
    refreshStore: () => Promise<void>;
    setActiveStoreId: (storeId: number | null) => void;
};

export const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
    const activeStoreId = selectedStoreId ?? user?.store_id ?? null;
    const [store, setStore] = useState<Store | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canFetchStore = isAuthenticated
        && !!activeStoreId
        && hasPermission(user?.role, "view_manager_actions");

    useEffect(() => {
        setClientContext({ storeId: activeStoreId });
        clearSWRCache();
    }, [activeStoreId]);

    const setActiveStoreId = useCallback((storeId: number | null) => {
        setSelectedStoreId(storeId);
        setClientContext({ storeId: storeId ?? user?.store_id ?? null });
        clearSWRCache();
    }, [user?.store_id]);

    const refreshStore = useCallback(async () => {
        if (!canFetchStore || !activeStoreId) {
            setStore(null);
            setError(null);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const endpoint = ENDPOINTS.MANAGER.STORE.get(activeStoreId);
            const result = await apiFetch<GetStoreResponse>(endpoint, { method: "GET" });
            setStore(result.store);
        } catch (err) {
            setStore(null);
            setError(String(err));
        } finally {
            setIsLoading(false);
        }
    }, [canFetchStore, activeStoreId]);

    useEffect(() => {
        if (authLoading) return;

        if (!canFetchStore) {
            setStore(null);
            setError(null);
            setIsLoading(false);
            return;
        }

        refreshStore();
    }, [authLoading, canFetchStore, refreshStore]);

    return (
        <StoreContext.Provider value={{ store, isLoading, error, refreshStore, setActiveStoreId }}>
            {children}
        </StoreContext.Provider>
    );
}
