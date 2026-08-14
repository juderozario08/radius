import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { PurchaseOrderSummary } from "@/types/receiving.types";
import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";

interface POCardProps {
    po: PurchaseOrderSummary;
    onPress: (poId: number) => void;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case "SHIPPED": return COLORS.primary; // Blue
        case "DELIVERING": return COLORS.primary; 
        case "DELIVERED": return COLORS.textSecondary; // Grayish
        case "PARTIAL": return "#F57C00"; // Yellow/Orange
        case "RECEIVED": return "#388E3C"; // Green
        default: return COLORS.textSecondary;
    }
};

export const POCard: React.FC<POCardProps> = ({ po, onPress }) => {
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    // Format PO ID to 8 digits
    const poNumber = po.po_id.toString().padStart(8, '0');
    const orderedDate = new Date(po.ordered_at).toLocaleDateString();
    const expectedDate = po.expected_at ? new Date(po.expected_at).toLocaleDateString() : 'N/A';

    let isOverdue = false;
    if (po.arrived_at && po.status !== "RECEIVED") {
        const arrived = new Date(po.arrived_at);
        const now = new Date();
        const diffHours = (now.getTime() - arrived.getTime()) / (1000 * 60 * 60);
        isOverdue = diffHours > 24;
    }

    return (
        <TouchableOpacity style={[globalStyles.card, isOverdue && styles.overdueCard]} onPress={() => onPress(po.po_id)}>
            <View style={globalStyles.cardHeader}>
                <View>
                    <Text style={styles.poNumber}>PO #{poNumber}</Text>
                    {isAdmin && <Text style={styles.storeName}>{po.store_name}</Text>}
                </View>
                <View style={[styles.badge, { backgroundColor: getStatusColor(po.status) }]}>
                    <Text style={styles.badgeText}>{po.status}</Text>
                </View>
            </View>

            <View style={styles.content}>
                <Text style={styles.supplierText}>{po.supplier_name}</Text>
                
                <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                        <Ionicons name="cube-outline" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.detailText}>{po.item_count} items</Text>
                    </View>
                    
                    <View style={styles.detailItem}>
                        <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.detailText}>Expected: {expectedDate}</Text>
                    </View>
                </View>

                {po.has_lprs && (
                    <View style={styles.lprContainer}>
                        <Ionicons name="barcode-outline" size={16} color="#0288D1" />
                        <Text style={styles.lprText}>Contains LPRs</Text>
                    </View>
                )}

                {isOverdue && (
                    <View style={styles.overdueContainer}>
                        <Ionicons name="warning" size={14} color="#D32F2F" />
                        <Text style={styles.overdueText}>Over 24h since arrival</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    poNumber: {
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.textPrimary,
    },
    storeName: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    badgeText: {
        color: "white",
        fontSize: 12,
        fontWeight: "bold",
    },
    content: {
        gap: 8,
    },
    supplierText: {
        fontSize: 16,
        color: COLORS.textPrimary,
    },
    detailsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 4,
    },
    detailItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    detailText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    lprContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#E1F5FE",
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginTop: 4,
    },
    lprText: {
        fontSize: 12,
        color: "#0288D1",
        fontWeight: "600",
    },
    overdueCard: {
        borderColor: "#D32F2F",
        borderWidth: 2,
    },
    overdueContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 4,
    },
    overdueText: {
        color: "#D32F2F",
        fontSize: 12,
        fontWeight: "bold",
    }
});
