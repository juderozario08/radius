import { apiFetch } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { LogoutResponse } from "@/types/auth.types";
import { Redirect, Tabs } from "expo-router";
import { Alert, Image, TouchableOpacity } from "react-native";
import Toast from "react-native-toast-message";

const activeTintColor = "#C70202";
const inactiveTintColor = "#8E8E8E";

function getIcon(focused: boolean, activeSource: any, inactiveSource: any) {
    return (
        <Image
            resizeMethod="scale"
            source={focused ? activeSource : inactiveSource}
            style={{ width: 30, height: 30 }}
            resizeMode="contain"
        />
    );
}

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
                tabBarActiveTintColor: activeTintColor,
                tabBarInactiveTintColor: inactiveTintColor,
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: "Home",
                    tabBarIcon: ({ focused }) =>
                        getIcon(
                            focused,
                            require("@/assets/images/home-active.png"),
                            require("@/assets/images/home-inactive.png")
                        ),
                }}
            />
            <Tabs.Screen
                name="price_tags"
                options={{
                    title: "Price Tags",
                    tabBarIcon: ({ focused }) =>
                        getIcon(
                            focused,
                            require("@/assets/images/barcode-active.png"),
                            require("@/assets/images/barcode-inactive.png")
                        ),
                }}
            />
            <Tabs.Screen
                name="inventory"
                options={{
                    title: "Inventory",
                    tabBarIcon: ({ focused }) =>
                        getIcon(
                            focused,
                            require("@/assets/images/inventory-active.png"),
                            require("@/assets/images/inventory-inactive.png")
                        ),
                }}
            />
            <Tabs.Screen
                name="store"
                options={{
                    title: "Store",
                    tabBarIcon: ({ focused }) =>
                        getIcon(
                            focused,
                            require("@/assets/images/store-active.png"),
                            require("@/assets/images/store-inactive.png")
                        ),
                }}
            />
        </Tabs>
    );
}
