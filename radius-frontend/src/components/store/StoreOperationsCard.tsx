import React from "react";
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    StyleProp,
    ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/colors";
import { StoreOperationSummary } from "@/types/admin.types";
import { SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";

export interface StoreOperationsCardProps {
    store: StoreOperationSummary;
    onSelect: (store: StoreOperationSummary) => void;
    isSelected?: boolean;
    style?: StyleProp<ViewStyle>;
}

export const StoreOperationsCard: React.FC<StoreOperationsCardProps> = ({
    store,
    onSelect,
    isSelected = false,
    style,
}) => {
    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onSelect(store)}
            style={[
                styles.card,
                isSelected && styles.selectedCard,
                store.has_active_operations && styles.activeCardBorder,
                style,
            ]}
        >
            <View style={styles.topRow}>
                <View style={styles.storeTitleGroup}>
                    <View style={[styles.storeIconContainer, store.has_active_operations ? styles.activeIconBg : styles.idleIconBg]}>
                        <Ionicons
                            name={store.is_head_office ? "business" : "storefront"}
                            size={18}
                            color={store.has_active_operations ? COLORS.primary : COLORS.textSecondary}
                        />
                    </View>
                    <View style={styles.storeNameContainer}>
                        <View style={styles.storeNameRow}>
                            <Text style={styles.storeName} numberOfLines={1}>
                                {store.name}
                            </Text>
                            {store.is_head_office && (
                                <View style={styles.headOfficeBadge}>
                                    <Text style={styles.headOfficeText}>HQ</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.storeSubtext}>
                            Store #{store.store_id} • {store.city}, {store.province}
                        </Text>
                    </View>
                </View>

                <View style={styles.statusPillContainer}>
                    {store.has_active_operations ? (
                        <View style={styles.activePill}>
                            <View style={styles.activeDot} />
                            <Text style={styles.activePillText}>Active</Text>
                        </View>
                    ) : (
                        <View style={styles.idlePill}>
                            <Text style={styles.idlePillText}>Idle</Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={13} color={COLORS.textSecondary} />
                <Text style={styles.addressText} numberOfLines={1}>
                    {store.address}, {store.city}
                </Text>
            </View>

            <View style={styles.metricsRow}>
                <View style={[styles.metricBadge, store.active_orders_count > 0 ? styles.metricOrderActive : styles.metricMuted]}>
                    <Ionicons
                        name="cart-outline"
                        size={14}
                        color={store.active_orders_count > 0 ? COLORS.warning : COLORS.textSecondary}
                    />
                    <Text style={[styles.metricLabel, store.active_orders_count > 0 && styles.metricLabelActive]}>
                        {store.active_orders_count} {store.active_orders_count === 1 ? "Order" : "Orders"}
                    </Text>
                </View>

                <View style={[styles.metricBadge, store.active_counts_count > 0 ? styles.metricCountActive : styles.metricMuted]}>
                    <Ionicons
                        name="clipboard-outline"
                        size={14}
                        color={store.active_counts_count > 0 ? COLORS.info : COLORS.textSecondary}
                    />
                    <Text style={[styles.metricLabel, store.active_counts_count > 0 && styles.metricLabelActive]}>
                        {store.active_counts_count} {store.active_counts_count === 1 ? "Count" : "Counts"}
                    </Text>
                </View>

                <View style={[styles.metricBadge, store.pending_pos_count > 0 ? styles.metricPoActive : styles.metricMuted]}>
                    <Ionicons
                        name="cube-outline"
                        size={14}
                        color={store.pending_pos_count > 0 ? COLORS.success : COLORS.textSecondary}
                    />
                    <Text style={[styles.metricLabel, store.pending_pos_count > 0 && styles.metricLabelActive]}>
                        {store.pending_pos_count} {store.pending_pos_count === 1 ? "PO" : "POs"}
                    </Text>
                </View>
            </View>

            <View style={styles.footerRow}>
                <Text style={styles.viewOpsText}>View Store Operations</Text>
                <Ionicons name="chevron-forward" size={15} color={COLORS.primary} />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.mdl,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    selectedCard: {
        borderColor: COLORS.primary,
        borderWidth: 2,
        backgroundColor: COLORS.primarySurface,
    },
    activeCardBorder: {
        borderColor: COLORS.successBorderLight,
    },
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: SPACING.sm,
    },
    storeTitleGroup: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginRight: SPACING.sm,
    },
    storeIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        marginRight: SPACING.smd,
    },
    activeIconBg: {
        backgroundColor: COLORS.inactiveBg,
    },
    idleIconBg: {
        backgroundColor: COLORS.background,
    },
    storeNameContainer: {
        flex: 1,
    },
    storeNameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xsm,
    },
    storeName: {
        fontSize: FONT_SIZE.mdl,
        fontWeight: "700",
        color: COLORS.textPrimary,
        flexShrink: 1,
    },
    headOfficeBadge: {
        backgroundColor: COLORS.violetBg,
        paddingHorizontal: SPACING.xsm,
        paddingVertical: 1,
        borderRadius: RADIUS.xs,
    },
    headOfficeText: {
        fontSize: FONT_SIZE.xxs,
        fontWeight: "700",
        color: COLORS.violet,
    },
    storeSubtext: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        marginTop: SPACING.xxs,
    },
    statusPillContainer: {
        alignItems: "flex-end",
    },
    activePill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.activeBg,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.lg,
        gap: SPACING.xs,
    },
    activeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.success,
    },
    activePillText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: "600",
        color: COLORS.success,
    },
    idlePill: {
        backgroundColor: COLORS.background,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.lg,
    },
    idlePillText: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textSecondary,
    },
    addressRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xs,
        marginBottom: SPACING.smd,
    },
    addressText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        flex: 1,
    },
    metricsRow: {
        flexDirection: "row",
        gap: SPACING.sm,
        marginBottom: SPACING.smd,
    },
    metricBadge: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: SPACING.xsm,
        paddingHorizontal: SPACING.xsm,
        borderRadius: RADIUS.md,
        gap: SPACING.xs,
    },
    metricMuted: {
        backgroundColor: COLORS.surfaceMuted,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    metricOrderActive: {
        backgroundColor: COLORS.warningBg,
        borderWidth: 1,
        borderColor: COLORS.warningBorderLight,
    },
    metricCountActive: {
        backgroundColor: COLORS.infoBg,
        borderWidth: 1,
        borderColor: COLORS.infoBorderLight,
    },
    metricPoActive: {
        backgroundColor: COLORS.activeBg,
        borderWidth: 1,
        borderColor: COLORS.successBorderLight,
    },
    metricLabel: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textSecondary,
        fontWeight: "500",
    },
    metricLabelActive: {
        color: COLORS.textPrimary,
        fontWeight: "600",
    },
    footerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: SPACING.sm,
        gap: SPACING.xs,
    },
    viewOpsText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: "600",
        color: COLORS.primary,
    },
});
