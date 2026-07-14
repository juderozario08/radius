//radius-frontend/app/(app)/home/dashboard/index.tsx
import HeaderComponent from "@/components/common/HeaderComponent";
import LogoutComponent from "@/components/common/Logout";
import NotificationIconComponent from "@/components/common/NotificationIcon";
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Dashboard() {
    return (
        <View style={styles.container}>
            <HeaderComponent
                headerRight={(
                    <View style={{ flexDirection: 'row' }}>
                        <NotificationIconComponent />
                        <LogoutComponent />
                    </View>
                )} />
            <Text style={styles.title}>Dashboard</Text>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 16 }}>No Tasks Here</Text>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    title: {
        marginLeft: 15,
        marginTop: 15,
        fontSize: 25,
        fontWeight: 'bold'
    }
})
