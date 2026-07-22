// radius-frontend/app/(app)/(tabs)/store/index.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { globalStyles } from "@/constants/styles";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission } from "@/utils/roles";
import HeaderComponent from "@/components/common/HeaderComponent";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import { COLORS } from "@/constants/colors";

export default function StoreScreen() {
    const { user } = useAuth();

    const isAdmin = hasPermission(user?.role, "view_admin_actions");
    const isManagerOrAdmin = hasPermission(user?.role, "view_manager_actions") || isAdmin;

    if (!isManagerOrAdmin) {
        return (
            <TopSafeAreaView>
                <HeaderComponent headerCenter={<View><Text style={globalStyles.headerTitle}>Access Denied</Text></View>} />
                <View style={[globalStyles.centerElement, { backgroundColor: COLORS.background }]}>
                    <Text style={styles.headerTitle}>Unauthorized</Text>
                    <Text style={styles.subText}>You do not have permission to view store management.</Text>
                </View>
            </TopSafeAreaView>
        );
    }

    return (
        <TopSafeAreaView>
            <HeaderComponent headerCenter={<Text style={globalStyles.headerTitle}>Active Sessions</Text>} />
            <View style={[globalStyles.centerElement, { backgroundColor: COLORS.background }]}>
                {isAdmin ? (
                    <View style={[globalStyles.centerElement]}>
                        <Text style={styles.headerTitle}>Company Stores</Text>
                        <Text style={styles.subText}>Viewing all regional store locations and global metrics.</Text>
                    </View>
                ) : (
                    <View>
                        <View style={[globalStyles.centerElement]}>
                            <Text style={styles.headerTitle}>Store #{user?.store_id} Overview</Text>
                            <Text style={styles.subText}>Viewing operational metrics for your assigned location.</Text>
                        </View>
                    </View>
                )}
            </View>
        </TopSafeAreaView>
    );
}

const styles = StyleSheet.create({
    headerTitle: {
        fontSize: 24,
        fontWeight: "700",
        marginBottom: 8,
        color: "#111",
    },
    subText: {
        fontSize: 15,
        color: "#666",
        marginBottom: 20,
    },
});
