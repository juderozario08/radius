import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { PurchaseOrderSummary } from "@/types/receiving.types";
import { COLORS } from "@/constants/colors";
import { globalStyles, SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";

interface POCardProps {
    po: PurchaseOrderSummary;
    onPress: (poId: number) => void;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case "SHIPPED": return COLORS.primary;
        case "DELIVERING": return COLORS.primary; 
        case "DELIVERED": return COLORS.textSecondary;
        case "PARTIAL": return COLORS.warningAccent;
        case "RECEIVED": return COLORS.successAccent;
        default: return COLORS.textSecondary;
    }
};

export const POCard: React.FC<POCardProps> = ({ po, onPress }) => {
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    const poNumber = po.po_id.toString().padStart(8, '0');
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
                        <Ionicons name="barcode-outline" size={16} color={COLORS.sky} />
                        <Text style={styles.lprText}>Contains LPRs</Text>
                    </View>
                )}

                {isOverdue && (
                    <View style={styles.overdueContainer}>
                        <Ionicons name="warning" size={14} color={COLORS.dangerAccent} />
                        <Text style={styles.overdueText}>Over 24h since arrival</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    poNumber: {
        fontSize: FONT_SIZE.xl,
        fontWeight: "bold",
        color: COLORS.textPrimary,
    },
    storeName: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        marginTop: SPACING.xxs,
    },
    badge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.xs,
    },
    badgeText: {
        color: "white",
        fontSize: FONT_SIZE.sm,
        fontWeight: "bold",
    },
    content: {
        gap: SPACING.sm,
    },
    supplierText: {
        fontSize: FONT_SIZE.lg,
        color: COLORS.textPrimary,
    },
    detailsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: SPACING.xs,
    },
    detailItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xs,
    },
    detailText: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
    },
    lprContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xs,
        backgroundColor: COLORS.skyBg,
        alignSelf: "flex-start",
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.xs,
        marginTop: SPACING.xs,
    },
    lprText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.sky,
        fontWeight: "600",
    },
    overdueCard: {
        borderColor: COLORS.dangerAccent,
        borderWidth: 2,
    },
    overdueContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xs,
        marginTop: SPACING.xs,
    },
    overdueText: {
        color: COLORS.dangerAccent,
        fontSize: FONT_SIZE.sm,
        fontWeight: "bold",
    }
});
