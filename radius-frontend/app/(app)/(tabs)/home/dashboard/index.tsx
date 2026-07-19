// radius-frontend/app/(app)/home/dashboard/index.tsx
import HeaderComponent from "@/components/common/HeaderComponent";
import LogoutComponent from "@/components/common/Logout";
import NotificationIconComponent from "@/components/common/NotificationIcon";
import { globalStyles } from "@/constants/styles";
import React from "react";
import { View, Text } from "react-native";

export default function Dashboard() {
    return (
        <View style={globalStyles.container}>
            <HeaderComponent
                headerRight={(
                    <View style={{ flexDirection: 'row' }}>
                        <NotificationIconComponent />
                        <LogoutComponent />
                    </View>
                )} />
            <Text style={globalStyles.pageTitle}>Dashboard</Text>
            <View style={globalStyles.centerElement}>
                <Text style={{ fontSize: 16 }}>No Tasks Here</Text>
            </View>
        </View>
    )
}
