import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";
import { useAuth } from "@/hooks/useAuth";
import { CustomerReturnSummary } from "@/types/returns.types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ReturnCardProps {
    returnItem: CustomerReturnSummary;
    onPress: (returnId: number) => void;
}

const getStatusBadgeStyle = (status: string) => {
    switch (status) {
        case "COMPLETED":
            return { bg: "#E8F5E9", text: "#2E7D32", border: "#388E3C" };
        case "PENDING_APPROVAL":
            return { bg: "#FFF3E0", text: "#E65100", border: "#F57C00" };
        case "APPROVED":
            return { bg: "#E3F2FD", text: "#1565C0", border: "#1976D2" };
        case "REJECTED":
            return { bg: "#FFEBEE", text: "#C62828", border: "#D32F2F" };
        default:
            return { bg: COLORS.surface, text: COLORS.textSecondary, border: COLORS.border };
    }
};

export const ReturnCard: React.FC<ReturnCardProps> = ({ returnItem, onPress }) => {
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";
    const badgeStyle = getStatusBadgeStyle(returnItem.status);

    const formattedDate = returnItem.created_at
        ? new Date(returnItem.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
          })
        : "N/A";

    return (
        <TouchableOpacity
            style={[globalStyles.card, { borderLeftColor: badgeStyle.border, borderLeftWidth: 4 }]}
            onPress={() => onPress(returnItem.return_id)}
            activeOpacity={0.7}
        >
            <View style={globalStyles.cardHeader}>
                <View style={styles.titleContainer}>
                    <Text style={styles.returnId}>Return #{returnItem.return_id}</Text>
                    {returnItem.original_transaction_id ? (
                        <Text style={styles.origTx}>Sale #{returnItem.original_transaction_id}</Text>
                    ) : (
                        <Text style={styles.origTx}>No Receipt</Text>
                    )}
                    {isAdmin && <Text style={styles.storeName}>{returnItem.store_name}</Text>}
                </View>
                <View style={[styles.badge, { backgroundColor: badgeStyle.bg }]}>
                    <Text style={[styles.badgeText, { color: badgeStyle.text }]}>
                        {returnItem.status.replace("_", " ")}
                    </Text>
                </View>
            </View>

            <View style={styles.content}>
                <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                        <Ionicons name="cube-outline" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.detailText}>{returnItem.item_count} items</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Ionicons name="cash-outline" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.refundAmount}>${returnItem.total_refund.toFixed(2)}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Ionicons name="card-outline" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.detailText}>{returnItem.refund_method.replace("_", " ")}</Text>
                    </View>
                </View>

                <View style={styles.footerRow}>
                    <View style={styles.detailItem}>
                        <Ionicons name="person-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.dateText}>{returnItem.employee_name}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.dateText}>{formattedDate}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    titleContainer: {
        flex: 1,
    },
    returnId: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    origTx: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    storeName: {
        fontSize: 12,
        color: COLORS.accent,
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: "flex-start",
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "700",
    },
    content: {
        marginTop: 10,
        gap: 8,
    },
    detailRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    detailItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    detailText: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    refundAmount: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.primary,
    },
    footerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 8,
        marginTop: 4,
    },
    dateText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
});

