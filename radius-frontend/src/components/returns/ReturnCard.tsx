import { COLORS } from "@/constants/colors";
import { globalStyles, SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";
import { useAuth } from "@/hooks/useAuth";
import { CustomerReturnSummary } from "@/types/returns.types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { formatMoney } from "@/utils/money";

interface ReturnCardProps {
    returnItem: CustomerReturnSummary;
    onPress: (returnId: number) => void;
}

const getStatusBadgeStyle = (status: string) => {
    switch (status) {
        case "COMPLETED":
            return { bg: COLORS.activeBg, text: COLORS.success, border: COLORS.successAccent };
        case "PENDING_APPROVAL":
            return { bg: COLORS.warningBg, text: COLORS.warning, border: COLORS.warningAccent };
        case "APPROVED":
            return { bg: COLORS.infoBg, text: COLORS.info, border: COLORS.infoAccent };
        case "REJECTED":
            return { bg: COLORS.inactiveBg, text: COLORS.dangerDark, border: COLORS.dangerAccent };
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
                        <Text style={styles.refundAmount}>{formatMoney(returnItem.total_refund)}</Text>
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
        fontSize: FONT_SIZE.lg,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    origTx: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textSecondary,
        marginTop: SPACING.xxs,
    },
    storeName: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.accent,
        marginTop: SPACING.xxs,
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
    },
    content: {
        marginTop: SPACING.smd,
        gap: SPACING.sm,
    },
    detailRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
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
    refundAmount: {
        fontSize: FONT_SIZE.mdl,
        fontWeight: "700",
        color: COLORS.primary,
    },
    footerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: SPACING.sm,
        marginTop: SPACING.xs,
    },
    dateText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
    },
});

