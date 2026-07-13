//radius-frontend/src/context/AuthContext.tsx
import { apiFetch } from "@/api/client";
import { deleteToken, getToken, saveToken } from "@/utils/token";
import { createContext, ReactNode, useEffect, useState } from "react";
import Toast from "react-native-toast-message";
import * as SecureStore from "expo-secure-store";
import { LoginResponse } from "@/types/auth.types";

export type UserInfo = Omit<LoginResponse, 'token'>;

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
                const res = await apiFetch<{ message: string }>("/api/verify_token", {
                    method: "POST",
                });

                const userInfoStr = await SecureStore.getItemAsync("user_info");
                if (userInfoStr) {
                    setUser(JSON.parse(userInfoStr));
                }

                setToken(t);
                setIsLoading(false);
                Toast.show({
                    type: "success",
                    text1: res.message,
                    visibilityTime: 1000,
                });
            } catch (err) {
                await deleteToken();
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
        await SecureStore.setItemAsync("user_info", JSON.stringify(userData));
        setToken(userData.token);

        const { token, ...userInfo } = userData;
        setUser(userInfo);
    }

    async function logout() {
        await deleteToken();
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
