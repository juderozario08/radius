import CustomToast from "@/components/common/Toast";
import { AuthProvider } from "@/context/AuthContext";
import { StoreProvider } from "@/context/StoreContext";
import { useAuth } from "@/hooks/useAuth";
import { navigationTracker } from "@/utils/navigationTracker";
import { Slot, useRouter, usePathname, useGlobalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StatusBar, View } from "react-native";

function NavigationHistoryWatcher() {
    const pathname = usePathname();
    const params = useGlobalSearchParams();

    useEffect(() => {
        if (pathname && !pathname.includes("/(auth)")) {
            navigationTracker.record(pathname, params as Record<string, any>);
        }
    }, [pathname, params]);

    return null;
}

function LoadingLayout() {
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

    return (
        <>
            <NavigationHistoryWatcher />
            <Slot />
        </>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <StoreProvider>
                <LoadingLayout />
                <CustomToast />
                <StatusBar
                    animated
                    translucent
                    backgroundColor={'transparent'}
                    barStyle={'dark-content'}
                />
            </StoreProvider>
        </AuthProvider>
    );
}
