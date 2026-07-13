//radius-frontend/app/_layout.tsx
import CustomToast from "@/components/common/Toast";
import { AuthProvider } from "@/context/AuthContext";
import { StoreProvider } from "@/context/StoreContext";
import { useAuth } from "@/hooks/useAuth";
import { Slot, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";


function InitialLayout() {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        if (!isAuthenticated) {
            router.replace("/(auth)/login");
        } else {
            router.replace("/(app)/(tabs)/home/dashboard");
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
                <CustomToast />
            </StoreProvider>
        </AuthProvider>
    );
}
