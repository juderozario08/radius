import { apiFetch, setClientContext, resetClientContext, UnauthorizedError } from "@/api/client";
import { deleteToken, getToken, saveToken, saveRefreshToken, deleteRefreshToken } from "@/utils/token";
import { createContext, ReactNode, useEffect, useState, useMemo } from "react";
import Toast from "react-native-toast-message";
import * as SecureStore from "expo-secure-store";
import { LoginResponse, LogoutResponse, VerifyTokenResponse } from "@/types/auth.types";
import { ENDPOINTS } from "@/constants/routes";
import { resetSessionExpiry } from "@/utils/helpers";

export type UserInfo = Omit<LoginResponse, 'token' | 'refresh_token'>;

type AuthContextType = {
    token: string | null;
    user: UserInfo | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (userData: LoginResponse) => Promise<void>;
    logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<UserInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const restoreStoredSession = async () => {
            const userInfoStr = await SecureStore.getItemAsync("user_info");
            if (!userInfoStr) {
                setToken(null);
                setUser(null);
                return;
            }
            const { token: _token, refresh_token: _refreshToken, ...storedUser } = JSON.parse(userInfoStr) as LoginResponse;
            setUser(storedUser);
            setClientContext({
                storeId: storedUser.store_id,
                employeeId: storedUser.employee_id,
            });
            setToken(await getToken());
        };

        const verifyToken = async () => {
            try {
                const t = await getToken();
                if (!t) {
                    setIsLoading(false);
                    return;
                }
                const res = await apiFetch<VerifyTokenResponse>(ENDPOINTS.AUTH.verifyToken, {
                    method: "POST",
                });
                await restoreStoredSession();
                setIsLoading(false);
                Toast.show({
                    type: "success",
                    text1: res.message,
                    visibilityTime: 1000,
                });
            } catch (err) {
                if (err instanceof UnauthorizedError) {
                    resetClientContext();
                    await deleteToken();
                    await deleteRefreshToken();
                    await SecureStore.deleteItemAsync("user_info");
                    setToken(null);
                    setUser(null);
                } else {
                    await restoreStoredSession().catch(() => {
                        setToken(null);
                        setUser(null);
                    });
                }
                setIsLoading(false);
                Toast.show({
                    type: "error",
                    text1: err instanceof Error ? err.message : String(err),
                    visibilityTime: 1000,
                    autoHide: true,
                    position: "bottom",
                });
            }
        };
        verifyToken();
    }, []);

    async function login(userData: LoginResponse) {
        const { token, refresh_token, ...userInfo } = userData;
        await saveToken(token);
        await saveRefreshToken(refresh_token);
        await SecureStore.setItemAsync("user_info", JSON.stringify(userInfo));
        setClientContext({
            storeId: userInfo.store_id,
            employeeId: userInfo.employee_id,
        });
        setToken(token);
        resetSessionExpiry();
        setUser(userInfo);
    }

    async function logout() {
        try {
            await apiFetch<LogoutResponse>(ENDPOINTS.AUTH.logout, {
                method: "POST",
            });
        } catch {
        }
        resetClientContext();
        await deleteToken();
        await deleteRefreshToken();
        await SecureStore.deleteItemAsync("user_info");
        setToken(null);
        setUser(null);
    }

    const contextValue = useMemo(() => ({
        token,
        user,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
    }), [token, user, isLoading]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}
