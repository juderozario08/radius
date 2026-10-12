import { COLORS } from "@/constants/colors";
import { globalStyles, SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";
import { useAuth } from "@/hooks/useAuth";
import { OutboundTransferSummary } from "@/types/receiving.types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { formatMoney } from "@/utils/money";

interface OutboundTransferCardProps {
    transfer: OutboundTransferSummary;
    onPress: (transferId: number) => void;
}

const getStatusBadgeStyle = (status: string) => {
    switch (status) {
        case "PENDING":
            return { bg: COLORS.warningBg, text: COLORS.warning, border: COLORS.warningAccent };
        case "IN_TRANSIT":
            return { bg: COLORS.infoBg, text: COLORS.info, border: COLORS.infoAccent };
        case "RECEIVED":
            return { bg: COLORS.activeBg, text: COLORS.success, border: COLORS.successAccent };
        case "CANCELLED":
            return { bg: COLORS.inactiveBg, text: COLORS.dangerDark, border: COLORS.dangerAccent };
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
                            <Text style={styles.detailText}>{formatMoney(transfer.total_transfer_cost)}</Text>
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
        marginRight: SPACING.sm,
    },
    transferId: {
        fontSize: FONT_SIZE.xl,
        fontWeight: "bold",
        color: COLORS.textPrimary,
    },
    storeName: {
        fontSize: FONT_SIZE.md,
        fontWeight: "600",
        color: COLORS.textPrimary,
        marginTop: SPACING.xxs,
    },
    fromStoreName: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        marginTop: 1,
    },
    badge: {
        paddingHorizontal: SPACING.smd,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.lg,
        alignSelf: "flex-start",
    },
    badgeText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: "700",
        textTransform: "uppercase",
    },
    content: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: SPACING.smd,
    },
    detailRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.md,
    },
    detailItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xs,
    },
    detailText: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textSecondary,
    },
    dateContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xxs,
    },
    dateText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
    },
    reasonContainer: {
        marginTop: SPACING.sm,
        paddingTop: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    reasonText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        fontStyle: "italic",
    },
});

