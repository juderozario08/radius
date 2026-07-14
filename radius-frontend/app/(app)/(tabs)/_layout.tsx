//radius-frontend/app/(app)/(tabs)/_layout.tsx
import { COLORS } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { Image } from "react-native";

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
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: COLORS.activeTint,
                tabBarInactiveTintColor: COLORS.inactiveTint,
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
                    title: "MIMS",
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
