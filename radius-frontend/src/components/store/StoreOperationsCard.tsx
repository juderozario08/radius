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
                        color={store.active_orders_count > 0 ? "#E65100" : COLORS.textSecondary}
                    />
                    <Text style={[styles.metricLabel, store.active_orders_count > 0 && styles.metricLabelActive]}>
                        {store.active_orders_count} {store.active_orders_count === 1 ? "Order" : "Orders"}
                    </Text>
                </View>

                <View style={[styles.metricBadge, store.active_counts_count > 0 ? styles.metricCountActive : styles.metricMuted]}>
                    <Ionicons
                        name="clipboard-outline"
                        size={14}
                        color={store.active_counts_count > 0 ? "#1565C0" : COLORS.textSecondary}
                    />
                    <Text style={[styles.metricLabel, store.active_counts_count > 0 && styles.metricLabelActive]}>
                        {store.active_counts_count} {store.active_counts_count === 1 ? "Count" : "Counts"}
                    </Text>
                </View>

                <View style={[styles.metricBadge, store.pending_pos_count > 0 ? styles.metricPoActive : styles.metricMuted]}>
                    <Ionicons
                        name="cube-outline"
                        size={14}
                        color={store.pending_pos_count > 0 ? "#2E7D32" : COLORS.textSecondary}
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
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    selectedCard: {
        borderColor: COLORS.primary,
        borderWidth: 2,
        backgroundColor: "#FFF8F8",
    },
    activeCardBorder: {
        borderColor: "#C8E6C9",
    },
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    storeTitleGroup: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginRight: 8,
    },
    storeIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    activeIconBg: {
        backgroundColor: "#FFEBEE",
    },
    idleIconBg: {
        backgroundColor: "#F5F5F5",
    },
    storeNameContainer: {
        flex: 1,
    },
    storeNameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    storeName: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.textPrimary,
        flexShrink: 1,
    },
    headOfficeBadge: {
        backgroundColor: "#EDE7F6",
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
    },
    headOfficeText: {
        fontSize: 10,
        fontWeight: "700",
        color: "#5E35B1",
    },
    storeSubtext: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    statusPillContainer: {
        alignItems: "flex-end",
    },
    activePill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E8F5E9",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    activeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#2E7D32",
    },
    activePillText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#2E7D32",
    },
    idlePill: {
        backgroundColor: "#F5F5F5",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    idlePillText: {
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    addressRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginBottom: 10,
    },
    addressText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        flex: 1,
    },
    metricsRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 10,
    },
    metricBadge: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 6,
        paddingHorizontal: 6,
        borderRadius: 8,
        gap: 4,
    },
    metricMuted: {
        backgroundColor: "#FAFAFA",
        borderWidth: 1,
        borderColor: "#EEEEEE",
    },
    metricOrderActive: {
        backgroundColor: "#FFF3E0",
        borderWidth: 1,
        borderColor: "#FFE0B2",
    },
    metricCountActive: {
        backgroundColor: "#E3F2FD",
        borderWidth: 1,
        borderColor: "#BBDEFB",
    },
    metricPoActive: {
        backgroundColor: "#E8F5E9",
        borderWidth: 1,
        borderColor: "#C8E6C9",
    },
    metricLabel: {
        fontSize: 11,
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
        paddingTop: 8,
        gap: 4,
    },
    viewOpsText: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.primary,
    },
});
