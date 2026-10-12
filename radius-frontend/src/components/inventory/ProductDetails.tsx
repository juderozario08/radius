import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { ProductScreenDetails } from "@/types/inventory.types";
import { COLORS } from "@/constants/colors";
import { DetailRow } from "@/components/common/DetailRow";
import { Ionicons } from "@expo/vector-icons";
import { SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";

interface ProductDetailsProps {
    details: ProductScreenDetails;
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({ details }) => {
    const { inventory } = details;

    const [isAvailableExpanded, setIsAvailableExpanded] = useState(false);
    const [isNonSellableExpanded, setIsNonSellableExpanded] = useState(false);

    const availableTotal = inventory.open_box_qty + inventory.new_qty;
    const nonSellableTotal = inventory.rtv_qty + inventory.code88_qty + inventory.bopis_qty + 
        inventory.quarantine_qty + inventory.repair_qty + inventory.customer_on_hold_qty + 
        inventory.fc_on_hold_qty + inventory.verify_qty + inventory.demo_qty;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.table}>
                <View style={[styles.row, styles.highlightRow]}>
                    <Text style={styles.rowLabel}>On hand</Text>
                    <Text style={styles.rowValue}>{inventory.on_hand_qty}</Text>
                </View>

                <TouchableOpacity 
                    style={[styles.row, styles.collapsibleRow]} 
                    onPress={() => setIsAvailableExpanded(!isAvailableExpanded)}
                    activeOpacity={0.7}
                >
                    <View style={styles.rowLabelContainer}>
                        <Text style={styles.rowLabel}>Available for selling</Text>
                        <Ionicons name={isAvailableExpanded ? "chevron-up" : "chevron-down"} size={16} color={COLORS.textSecondary} />
                    </View>
                    <Text style={styles.rowValue}>{availableTotal}</Text>
                </TouchableOpacity>
                {isAvailableExpanded && (
                    <View style={styles.expandedContent}>
                        <DetailRow label="Open box" value={inventory.open_box_qty} />
                        <DetailRow label="New" value={inventory.new_qty} />
                    </View>
                )}

                <TouchableOpacity 
                    style={[styles.row, styles.collapsibleRow]} 
                    onPress={() => setIsNonSellableExpanded(!isNonSellableExpanded)}
                    activeOpacity={0.7}
                >
                    <View style={styles.rowLabelContainer}>
                        <Text style={styles.rowLabel}>Non sellable</Text>
                        <Ionicons name={isNonSellableExpanded ? "chevron-up" : "chevron-down"} size={16} color={COLORS.textSecondary} />
                    </View>
                    <Text style={styles.rowValue}>{nonSellableTotal}</Text>
                </TouchableOpacity>
                {isNonSellableExpanded && (
                    <View style={styles.expandedContent}>
                        <DetailRow label="RTV" value={inventory.rtv_qty} />
                        <DetailRow label="Code88" value={inventory.code88_qty} />
                        <DetailRow label="BOPIS" value={inventory.bopis_qty} />
                        <DetailRow label="Quarantine" value={inventory.quarantine_qty} />
                        <DetailRow label="Repair" value={inventory.repair_qty} />
                        <DetailRow label="Customer on hold" value={inventory.customer_on_hold_qty} />
                        <DetailRow label="FC on hold" value={inventory.fc_on_hold_qty} />
                        <DetailRow label="Verify" value={inventory.verify_qty} />
                        <DetailRow label="Demo" value={inventory.demo_qty} />
                    </View>
                )}

                <View style={styles.row}>
                    <View style={styles.rowLabelContainer}>
                        <Text style={styles.rowLabel}>On order</Text>
                        <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
                    </View>
                    <Text style={styles.rowValue}>{inventory.on_order_qty}</Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.rowLabel}>Last received</Text>
                    <View style={styles.lastReceivedValueContainer}>
                        {inventory.last_received_at ? (
                            <>
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>Received</Text>
                                </View>
                                <Text style={styles.rowValue}>
                                    {new Date(inventory.last_received_at).toLocaleDateString()}
                                </Text>
                            </>
                        ) : (
                            <Text style={styles.rowValue}>Never</Text>
                        )}
                    </View>
                </View>
            </View>

            <TouchableOpacity style={styles.linkButton}>
                <Ionicons name="open-outline" size={16} color={COLORS.primary} style={{ marginRight: SPACING.sm }} />
                <Text style={styles.linkButtonText}>Details on Staples.ca</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    table: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        margin: SPACING.lg,
        overflow: "hidden",
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: SPACING.mdl,
        paddingHorizontal: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    highlightRow: {
        backgroundColor: COLORS.blackAlpha02,
    },
    collapsibleRow: {
        backgroundColor: COLORS.blackAlpha02,
    },
    rowLabelContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    rowLabel: {
        fontSize: FONT_SIZE.mdl,
        color: COLORS.textPrimary,
        marginRight: SPACING.sm,
    },
    rowValue: {
        fontSize: FONT_SIZE.mdl,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    expandedContent: {
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.lg,
        backgroundColor: COLORS.surface,
    },
    lastReceivedValueContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    badge: {
        backgroundColor: COLORS.error,
        paddingHorizontal: SPACING.xsm,
        paddingVertical: SPACING.xxs,
        borderRadius: RADIUS.xs,
        marginRight: SPACING.sm,
    },
    badgeText: {
        color: COLORS.primaryText,
        fontSize: FONT_SIZE.sm,
        fontWeight: "600",
    },
    linkButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.primary,
        borderRadius: RADIUS.md,
        marginHorizontal: SPACING.lg,
        marginTop: SPACING.sm,
    },
    linkButtonText: {
        color: COLORS.primary,
        fontWeight: "600",
        fontSize: FONT_SIZE.md,
    },
});
