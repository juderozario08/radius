// radius-frontend/app/(app)/(tabs)/store.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { globalStyles } from "@/constants/styles";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission } from "@/utils/roles";
import HeaderComponent from "@/components/common/HeaderComponent";

export default function StoreScreen() {
    const { user } = useAuth();

    const isAdmin = hasPermission(user?.role, "view_admin_actions");
    const isManagerOrAdmin = hasPermission(user?.role, "view_employees") || isAdmin;

    if (isManagerOrAdmin) {
        return (
            <View style={globalStyles.container}>
                <HeaderComponent headerCenter={<Text style={globalStyles.headerTitle}>Access Denied</Text>} />
                <View style={[globalStyles.centerElement, { paddingHorizontal: 24 }]}>
                    <Text style={styles.headerTitle}>Unauthorized</Text>
                    <Text style={styles.subText}>You do not have permission to view store management.</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={globalStyles.container}>
            <HeaderComponent headerCenter={<Text style={globalStyles.headerTitle}>Store{isAdmin && "s"}</Text>} />
            <View style={[globalStyles.centerElement, { paddingHorizontal: 24 }]}>
                {isAdmin ? (
                    // --- ADMIN VIEW: Company-Wide Store Management ---
                    <View>
                        <Text style={styles.headerTitle}>Company Stores</Text>
                        <Text style={styles.subText}>Viewing all regional store locations and global metrics.</Text>
                        {/* Drop your Admin store selector / multi-store list component here */}
                    </View>
                ) : (
                    // --- MANAGER VIEW: Single Assigned Store ---
                    <View>
                        <Text style={styles.headerTitle}>Store #{user?.store_id} Overview</Text>
                        <Text style={styles.subText}>Viewing operational metrics for your assigned location.</Text>
                        {/* Drop your single-store operational dashboard here */}
                    </View>
                )}
            </View>
        </View>
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
