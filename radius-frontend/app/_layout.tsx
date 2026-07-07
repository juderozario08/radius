import { AuthProvider } from "@/context/AuthContext";
import { StoreProvider } from "@/context/StoreContext";
import { useAuth } from "@/hooks/useAuth";
import { Slot, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import Toast, { BaseToast, ErrorToast, ToastProps } from "react-native-toast-message";

const toastConfig = {
    success: (props: ToastProps) => (
        <BaseToast
            {...props}
            style={{
                backgroundColor: "#16A34A",
                borderWidth: 2,
                borderLeftWidth: 2,
                borderColor: "#4ADE80",
                borderLeftColor: "#4ADE80",
                borderRadius: 10,
            }}
            text1Style={{ color: "#F0FDF4", fontSize: 16, fontWeight: "600" }}
        />
    ),
    error: (props: ToastProps) => (
        <ErrorToast
            {...props}
            style={{
                backgroundColor: "#DC2626",
                borderWidth: 2,
                borderLeftWidth: 2,
                borderColor: "#F87171",
                borderLeftColor: "#F87171",
                borderRadius: 10,
            }}
            text1Style={{ color: "#FEF2F2", fontSize: 16, fontWeight: "600" }}
        />
    ),
    info: (props: ToastProps) => (
        <BaseToast
            {...props}
            style={{
                backgroundColor: "#2563EB",
                borderLeftWidth: 2,
                borderWidth: 2,
                borderColor: "#60A5FA",
                borderLeftColor: "#60A5FA",
                borderRadius: 10,
            }}
            text1Style={{ color: "#EFF6FF", fontSize: 16, fontWeight: "600" }}
        />
    ),
    warning: (props: ToastProps) => (
        <BaseToast
            {...props}
            style={{
                backgroundColor: "#D97706",
                borderLeftWidth: 2,
                borderWidth: 2,
                borderColor: "#FBBF24",
                borderLeftColor: "#FBBF24",
                borderRadius: 10,
            }}
            text1Style={{ color: "#FFFBEB", fontSize: 16, fontWeight: "600" }}
        />
    ),
};

function InitialLayout() {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        if (!isAuthenticated) {
            router.replace("/(auth)/login");
        } else {
            router.replace("/(app)/dashboard");
        }
    }, [isAuthenticated, isLoading]);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return <Slot />;
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <StoreProvider>
                <InitialLayout />
                <Toast config={toastConfig} />
            </StoreProvider>
        </AuthProvider>
    );
}
