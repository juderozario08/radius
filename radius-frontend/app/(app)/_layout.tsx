import { apiFetch } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { LogoutResponse } from "@/types/auth.types";
import { Redirect, Tabs } from "expo-router";
import { Alert, Image, TouchableOpacity } from "react-native";
import Toast from "react-native-toast-message";

export default function AppLayout() {
    const { isAuthenticated, logout } = useAuth();

    if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

    async function submitLogout() {
        try {
            const res = await apiFetch<LogoutResponse>("/api/logout", {
                method: "POST",
            });
            await logout();
            Toast.show({
                type: "success",
                text1: res.message,
                visibilityTime: 3000,
                autoHide: true,
                position: "bottom",
            });
        } catch (err) {
            console.error(err);
            Alert.alert("An error occured", String(err));
        }
    }

    return (
        <Tabs
            screenOptions={{
                headerShown: true,
                headerRight: () => (
                    <TouchableOpacity onPress={submitLogout}>
                        <Image
                            source={require("@/assets/images/logout.png")}
                            style={{
                                width: 30,
                                height: 30,
                                marginRight: 10,
                            }}
                        />
                    </TouchableOpacity>
                ),
            }}
        >
            <Tabs.Screen name="dashboard" options={{ title: "Home" }} />
            <Tabs.Screen name="inventory" options={{ title: "Inventory" }} />
            <Tabs.Screen name="orders" options={{ title: "Orders" }} />
            <Tabs.Screen name="reports" options={{ title: "Reports" }} />
            <Tabs.Screen name="store" options={{ title: "Store" }} />
            <Tabs.Screen name="profile" options={{ title: "Profile" }} />
        </Tabs>
    );
}
