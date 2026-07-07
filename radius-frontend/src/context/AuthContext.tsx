import { apiFetch } from "@/api/client";
import { deleteToken, getToken, saveToken } from "@/utils/token";
import { createContext, ReactNode, useEffect, useState } from "react";
import Toast from "react-native-toast-message";

type AuthContextType = {
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (token: string) => Promise<void>;
    logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
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
                setToken(t);
                setIsLoading(false);
                Toast.show({
                    type: "success",
                    text1: res.message,
                    visibilityTime: 1000,
                });
            } catch (err) {
                await deleteToken();
                setToken(null);
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

    async function login(t: string) {
        await saveToken(t);
        setToken(t);
    }

    async function logout() {
        await deleteToken();
        setToken(null);
    }

    return (
        <AuthContext.Provider
            value={{
                token,
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
