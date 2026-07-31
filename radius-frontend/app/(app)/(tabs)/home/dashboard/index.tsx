// radius-frontend/app/(app)/home/dashboard/index.tsx
import HeaderComponent from "@/components/common/HeaderComponent";
import LogoutComponent from "@/components/common/Logout";
import NotificationIconComponent from "@/components/common/NotificationIcon";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import { globalStyles } from "@/constants/styles";
import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
    const { user } = useAuth();

    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerRight={[<NotificationIconComponent />, <LogoutComponent />]} />
            <View style={[globalStyles.container]}>
                <Text style={[styles.pageTitle]}>
                    Welcome, {user?.last_name ?? "User"}
                </Text>
                <Text style={globalStyles.pageTitle}>Dashboard</Text>

                <View style={globalStyles.centerElement}>
                    <Text style={{ fontSize: 16 }}>No Tasks Here</Text>
                </View>
            </View>
        </TopSafeAreaView>
    )
}

const styles = StyleSheet.create({
    pageTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginLeft: 15,
        marginTop: 15,
    },
})