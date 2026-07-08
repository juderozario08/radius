import { apiFetch } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { LogoutResponse } from "@/types/auth.types";
import { Redirect, router, Tabs } from "expo-router";
import { Alert, Image, TouchableOpacity, View } from "react-native";
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

    // NOTE: FIGURE OUT LATER HOW TO DO NOTIFICATIONS VIEW FOR ACTIVITIES GOING ON
    async function getNotifications() {
        Toast.show({
            type: 'info',
            text1: 'Show notifications',
            position: 'bottom',
            visibilityTime: 1000
        })
    }

    return (
        <Tabs
            screenOptions={{
                headerShown: true,
                headerRight: () => (
                    <View style={{ flexDirection: 'row', marginRight: 10 }}>
                        <TouchableOpacity onPress={getNotifications}>
                            <Image
                                source={require("@/assets/images/notification-bell.png")}
                                style={{
                                    width: 30,
                                    height: 30,
                                }}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={submitLogout}>
                            <Image
                                source={require("@/assets/images/logout.png")}
                                style={{
                                    width: 30,
                                    height: 30,
                                    marginLeft: 10
                                }}
                            />
                        </TouchableOpacity>
                    </View>
                ),
                tabBarActiveTintColor: activeTintColor,
                tabBarInactiveTintColor: inactiveTintColor,
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    headerTitleAlign: "center",
                    title: "Home",
                    tabBarIcon: ({ focused }) => {
                        return getIcon(
                            focused,
                            require("@/assets/images/home-active.png"),
                            require("@/assets/images/home-inactive.png")
                        )
                    }
                }}
            />
            <Tabs.Screen
                name="price_tags"
                options={{
                    headerTitleAlign: "center",
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
                    headerTitleAlign: "center",
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
                    headerTitleAlign: "center",
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
