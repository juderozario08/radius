//radius-frontend/src/context/AuthContext.tsx
import { apiFetch } from "@/api/client";
import { deleteToken, getToken, saveToken, saveRefreshToken, deleteRefreshToken } from "@/utils/token";
import { createContext, ReactNode, useEffect, useState } from "react";
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
                // apiFetch will auto-refresh the access token if it's expired
                // (via the interceptor in client.ts), so this call transparently
                // handles both valid and expired-but-refreshable access tokens.
                const res = await apiFetch<VerifyTokenResponse>(ENDPOINTS.AUTHENTICATED.verify_token, {
                    method: "POST",
                });

                const userInfoStr = await SecureStore.getItemAsync("user_info");
                if (userInfoStr) {
                    setUser(JSON.parse(userInfoStr));
                }

                // Re-read token from SecureStore in case it was refreshed
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
            await apiFetch<LogoutResponse>(ENDPOINTS.AUTHENTICATED.logout, {
                method: "POST",
            });
        } catch {
            // Best-effort: if the backend call fails (e.g. token already expired),
            // we still clear local state to let the user re-authenticate.
        }
        await deleteToken();
        await deleteRefreshToken();
        await SecureStore.deleteItemAsync("user_info");
        setToken(null);
        setUser(null);
    }

    return (
        <AuthContext.Provider
            value={{
                token,
                user,
                isAuthenticated: !!token,
                isLoading,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
