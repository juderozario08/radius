//radius-frontend/src/context/StoreContext.tsx
import { apiFetch } from "@/api/client";
import { ENDPOINTS } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { GetStoreResponse, Store } from "@/types/admin.types";
import { hasPermission } from "@/utils/roles";
import { createContext, ReactNode, useCallback, useEffect, useState, useMemo } from "react";

type StoreContextType = {
    store: Store | null;
    isLoading: boolean;
    error: string | null;
    refreshStore: () => Promise<void>;
};

export const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const [store, setStore] = useState<Store | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canFetchStore = isAuthenticated
        && !!user?.store_id
        && hasPermission(user.role, "view_manager_actions");

    const refreshStore = useCallback(async () => {
        if (!canFetchStore || !user?.store_id) {
            setStore(null);
            setError(null);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const endpoint = `${ENDPOINTS.AUTHENTICATED.MANAGER.STORE.get}?store_id=${user.store_id}`;
            const result = await apiFetch<GetStoreResponse>(endpoint, { method: "GET" });
            setStore(result.store);
        } catch (err) {
            setStore(null);
            setError(String(err));
        } finally {
            setIsLoading(false);
        }
    }, [canFetchStore, user?.store_id]);

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

    const contextValue = useMemo(() => ({
        store,
        isLoading,
        error,
        refreshStore
    }), [store, isLoading, error, refreshStore]);

    return (
        <StoreContext.Provider value={contextValue}>
            {children}
        </StoreContext.Provider>
    );
}
