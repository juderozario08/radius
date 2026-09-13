import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";
import { useAuth } from "@/hooks/useAuth";
import { OutboundTransferSummary } from "@/types/receiving.types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface OutboundTransferCardProps {
    transfer: OutboundTransferSummary;
    onPress: (transferId: number) => void;
}

const getStatusBadgeStyle = (status: string) => {
    switch (status) {
        case "PENDING":
            return { bg: "#FFF3E0", text: "#E65100", border: "#F57C00" };
        case "IN_TRANSIT":
            return { bg: "#E3F2FD", text: "#1565C0", border: "#1976D2" };
        case "RECEIVED":
            return { bg: "#E8F5E9", text: "#2E7D32", border: "#388E3C" };
        case "CANCELLED":
            return { bg: "#FFEBEE", text: "#C62828", border: "#D32F2F" };
        default:
            return { bg: COLORS.surface, text: COLORS.textSecondary, border: COLORS.border };
    }
};

export const OutboundTransferCard: React.FC<OutboundTransferCardProps> = ({ transfer, onPress }) => {
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";
    const badgeStyle = getStatusBadgeStyle(transfer.status);

    return (
        <TouchableOpacity
            style={[globalStyles.card, { borderLeftColor: badgeStyle.border, borderLeftWidth: 4 }]}
            onPress={() => onPress(transfer.transfer_id)}
            activeOpacity={0.7}
        >
            <View style={globalStyles.cardHeader}>
                <View style={styles.titleContainer}>
                    <Text style={styles.transferId}>Transfer #{transfer.transfer_id}</Text>
                    <Text style={styles.storeName}>To: {transfer.to_store_name}</Text>
                    {isAdmin && <Text style={styles.fromStoreName}>From: {transfer.from_store_name}</Text>}
                </View>
                <View style={[styles.badge, { backgroundColor: badgeStyle.bg }]}>
                    <Text style={[styles.badgeText, { color: badgeStyle.text }]}>{transfer.status.replace("_", " ")}</Text>
                </View>
            </View>

            <View style={styles.content}>
                <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                        <Ionicons name="cube-outline" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.detailText}>{transfer.item_count} items</Text>
                    </View>
                    {transfer.total_transfer_cost > 0 && (
                        <View style={styles.detailItem}>
                            <Ionicons name="cash-outline" size={16} color={COLORS.textSecondary} />
                            <Text style={styles.detailText}>${transfer.total_transfer_cost.toFixed(2)}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.dateContainer}>
                    <Text style={styles.dateText}>
                        {new Date(transfer.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                </View>
            </View>

            {transfer.transfer_reason && (
                <View style={styles.reasonContainer}>
                    <Text style={styles.reasonText} numberOfLines={1}>Reason: {transfer.transfer_reason}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    titleContainer: {
        flex: 1,
        marginRight: 8,
    },
    transferId: {
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.textPrimary,
    },
    storeName: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textPrimary,
        marginTop: 2,
    },
    fromStoreName: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 1,
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
        textTransform: "uppercase",
    },
    content: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 10,
    },
    detailRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
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
    dateContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
    },
    dateText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    reasonContainer: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    reasonText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontStyle: "italic",
    },
});

