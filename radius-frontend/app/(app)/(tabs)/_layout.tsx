//radius-frontend/app/(app)/(tabs)/_layout.tsx
import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission } from "@/utils/roles";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { Image } from "react-native";

function getIcon(focused: boolean, activeSource: any, inactiveSource: any) {
    return (
        <Image
            resizeMethod="scale"
            source={focused ? activeSource : inactiveSource}
            style={globalStyles.headerImageSize}
        />
    );
}

export default function AppLayout() {
    const { isAuthenticated, user } = useAuth();

    if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
    const canViewStoreTab = hasPermission(user?.role, "view_manager_actions");

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
                    href: canViewStoreTab ? undefined : null,
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
