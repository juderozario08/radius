import { apiFetch } from "@/api/client";
import { deleteToken, getToken, saveToken, saveRefreshToken, deleteRefreshToken } from "@/utils/token";
import { createContext, ReactNode, useEffect, useState, useMemo } from "react";
import Toast from "react-native-toast-message";
import * as SecureStore from "expo-secure-store";
import { LoginResponse, LogoutResponse, VerifyTokenResponse } from "@/types/auth.types";
import { ENDPOINTS } from "@/constants/routes";

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

                const userInfoStr = await SecureStore.getItemAsync("user_info");
                if (userInfoStr) {
                    setUser(JSON.parse(userInfoStr));
                }

                const currentToken = await getToken();
                setToken(currentToken);
                setIsLoading(false);
                Toast.show({
                    type: "success",
                    text1: res.message,
                    visibilityTime: 1000,
                });
            } catch (err) {
                await deleteToken();
                await deleteRefreshToken();
                await SecureStore.deleteItemAsync("user_info");
                setToken(null);
                setUser(null);
                setIsLoading(false);
                Toast.show({
                    type: "error",
                    text1: String(err),
                    visibilityTime: 1000,
                    autoHide: true,
                    position: "bottom",
                });
            }
        };
        verifyToken();
    }, []);

    async function login(userData: LoginResponse) {
        await saveToken(userData.token);
        await saveRefreshToken(userData.refresh_token);
        await SecureStore.setItemAsync("user_info", JSON.stringify(userData));
        setToken(userData.token);

        const { token, refresh_token, ...userInfo } = userData;
        setUser(userInfo);
    }

    async function logout() {
        try {
            await apiFetch<LogoutResponse>(ENDPOINTS.AUTH.logout, {
                method: "POST",
            });
        } catch {
        }
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
