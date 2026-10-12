import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, GestureResponderEvent } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FillReportItemDetail } from '@/types/report.types';
import { COLORS } from '@/constants/colors';
import { SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";

interface FillReportItemProps {
    item: FillReportItemDetail;
    onPress?: (item: FillReportItemDetail) => void;
}

export const FillReportItem: React.FC<FillReportItemProps> = ({ item, onPress }) => {
    const router = useRouter();
    const isNegative = item.on_hand_qty < 0;
    const isZero = item.on_hand_qty === 0;

    const handlePress = () => {
        if (onPress) {
            onPress(item);
            return;
        }

        if (isNegative) {
            router.push(`/(app)/(tabs)/home/actions/sales_floor/ItemAdjust?productId=${item.product_id}`);
        } else {
            router.push(`/(app)/(tabs)/inventory/${item.product_id}`);
        }
    };

    const handleAdjustPress = (e: GestureResponderEvent) => {
        e.stopPropagation?.();
        router.push(`/(app)/(tabs)/home/actions/sales_floor/ItemAdjust?productId=${item.product_id}`);
    };

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePress}
            style={[
                styles.card,
                isNegative && styles.negativeCard,
                item.is_empty_hole && styles.is4tcCard,
            ]}
        >
            <View style={styles.headerRow}>
                <View style={styles.tagsContainer}>
                    {item.aisle ? (
                        <View style={styles.aisleBadge}>
                            <Ionicons name="git-commit-outline" size={13} color={COLORS.accent} />
                            <Text style={styles.aisleText}>Aisle {item.aisle}</Text>
                        </View>
                    ) : (
                        <View style={styles.unassignedBadge}>
                            <Text style={styles.unassignedText}>No Aisle</Text>
                        </View>
                    )}

                    {item.mims_location_id && (
                        <View style={styles.binBadge}>
                            <Ionicons name="cube-outline" size={13} color={COLORS.textSecondary} />
                            <Text style={styles.binText}>{item.mims_location_id}</Text>
                        </View>
                    )}

                    {item.brand ? (
                        <View style={styles.brandBadge}>
                            <Text style={styles.brandText}>{item.brand}</Text>
                        </View>
                    ) : null}
                </View>

                {item.is_empty_hole ? (
                    <View style={styles.redIs4tcBadge}>
                        <MaterialCommunityIcons name="alert-decagram" size={14} color={COLORS.primaryText} />
                        <Text style={styles.redIs4tcText}>IS4TC</Text>
                    </View>
                ) : (
                    <View style={styles.txSourceBadge}>
                        <Ionicons name="cart-outline" size={13} color={COLORS.accent} />
                        <Text style={styles.txSourceText}>POS Sale</Text>
                    </View>
                )}
            </View>

            <View style={styles.body}>
                <Text style={[styles.productName, isNegative && styles.negativeTextDim]} numberOfLines={2}>
                    {item.product_name}
                </Text>

                <View style={styles.identifiersRow}>
                    <Text style={styles.skuText}>SKU: <Text style={styles.codeText}>{item.product_sku}</Text></Text>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.upcText}>UPC: <Text style={styles.codeText}>{item.product_upc}</Text></Text>
                </View>

                {item.category_name ? (
                    <Text style={styles.categoryText}>Category: {item.category_name}</Text>
                ) : null}
            </View>

            <View style={styles.quantitiesSection}>
                {!item.is_empty_hole && (
                    <View style={styles.fillQtyContainer}>
                        <Text style={styles.qtyLabel}>Fill Qty</Text>
                        <View style={styles.fillQtyBadge}>
                            <Ionicons name="arrow-up-circle" size={16} color={COLORS.primaryText} />
                            <Text style={styles.fillQtyValue}>+{item.fill_qty}</Text>
                        </View>
                    </View>
                )}

                <View style={styles.onHandQtyContainer}>
                    <Text style={styles.qtyLabel}>On Hand</Text>
                    <View
                        style={[
                            styles.onHandBadge,
                            isNegative
                                ? styles.onHandNegative
                                : isZero
                                ? styles.onHandZero
                                : styles.onHandPositive,
                        ]}
                    >
                        <Ionicons
                            name={isNegative ? "alert-circle" : isZero ? "remove-circle" : "checkmark-circle"}
                            size={15}
                            color={isNegative ? COLORS.danger : isZero ? COLORS.warning : COLORS.success}
                        />
                        <Text
                            style={[
                                styles.onHandValue,
                                isNegative
                                    ? styles.onHandTextNegative
                                    : isZero
                                    ? styles.onHandTextZero
                                    : styles.onHandTextPositive,
                            ]}
                        >
                            {item.on_hand_qty}
                        </Text>
                    </View>
                </View>

                <View style={styles.availableContainer}>
                    <Text style={styles.qtyLabel}>Available</Text>
                    <Text style={styles.availableValue}>{item.available_qty}</Text>
                </View>
            </View>

            {isNegative && (
                <TouchableOpacity
                    style={styles.negativeBanner}
                    onPress={handleAdjustPress}
                    activeOpacity={0.7}
                >
                    <View style={styles.negativeBannerLeft}>
                        <Ionicons name="warning" size={16} color={COLORS.danger} />
                        <Text style={styles.negativeBannerText}>
                            Negative stock anomaly ({item.on_hand_qty}) — Tap to Inspect & Adjust
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.danger} />
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.mdl,
        marginBottom: SPACING.smd,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    negativeCard: {
        backgroundColor: COLORS.surfaceMuted,
        borderLeftColor: COLORS.textMuted,
        borderColor: COLORS.inputBorder,
        borderWidth: 1,
        borderLeftWidth: 4,
        opacity: 0.9,
    },
    is4tcCard: {
        borderLeftColor: COLORS.dangerAccent,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: SPACING.xsm,
        flex: 1,
        marginRight: SPACING.sm,
    },
    aisleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: COLORS.infoBg,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
    },
    aisleText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '700',
        color: COLORS.accent,
    },
    unassignedBadge: {
        backgroundColor: COLORS.border,
        paddingHorizontal: SPACING.xsm,
        paddingVertical: SPACING.xxs,
        borderRadius: RADIUS.sm,
    },
    unassignedText: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textSecondary,
    },
    binBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: COLORS.neutralBg,
        paddingHorizontal: SPACING.xsm,
        paddingVertical: SPACING.xxs,
        borderRadius: RADIUS.sm,
    },
    binText: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textSecondary,
        fontFamily: 'monospace',
    },
    brandBadge: {
        backgroundColor: COLORS.background,
        paddingHorizontal: SPACING.xsm,
        paddingVertical: SPACING.xxs,
        borderRadius: RADIUS.sm,
    },
    brandText: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    redIs4tcBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        backgroundColor: COLORS.dangerAccent,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.sm,
        shadowColor: COLORS.dangerAccent,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 2,
    },
    redIs4tcText: {
        color: COLORS.primaryText,
        fontSize: FONT_SIZE.sm,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    txSourceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: COLORS.activeBg,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
    },
    txSourceText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '600',
        color: COLORS.success,
    },
    body: {
        marginBottom: SPACING.smd,
    },
    productName: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
        lineHeight: 22,
        marginBottom: SPACING.xs,
    },
    negativeTextDim: {
        color: COLORS.textDim,
    },
    identifiersRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xsm,
        marginBottom: SPACING.xxs,
    },
    skuText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
    },
    upcText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
    },
    codeText: {
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    bulletDot: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZE.xxs,
    },
    categoryText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
        marginTop: SPACING.xxs,
    },
    quantitiesSection: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceMuted,
        borderRadius: RADIUS.md,
        padding: SPACING.sm,
        gap: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    fillQtyContainer: {
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    onHandQtyContainer: {
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    availableContainer: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        marginLeft: 'auto',
    },
    qtyLabel: {
        fontSize: FONT_SIZE.xxs,
        fontWeight: '600',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        marginBottom: 3,
    },
    fillQtyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.smd,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
    },
    fillQtyValue: {
        color: COLORS.primaryText,
        fontWeight: 'bold',
        fontSize: FONT_SIZE.md,
    },
    onHandBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
    },
    onHandPositive: {
        backgroundColor: COLORS.activeBg,
    },
    onHandZero: {
        backgroundColor: COLORS.warningBg,
    },
    onHandNegative: {
        backgroundColor: COLORS.inactiveBg,
    },
    onHandValue: {
        fontSize: FONT_SIZE.md,
        fontWeight: 'bold',
    },
    onHandTextPositive: {
        color: COLORS.success,
    },
    onHandTextZero: {
        color: COLORS.warning,
    },
    onHandTextNegative: {
        color: COLORS.danger,
    },
    availableValue: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
        paddingVertical: 3,
    },
    negativeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.inactiveBg,
        paddingVertical: SPACING.xsm,
        paddingHorizontal: SPACING.smd,
        borderRadius: RADIUS.sm,
        marginTop: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.dangerBorderLight,
    },
    negativeBannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xsm,
        flex: 1,
    },
    negativeBannerText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.danger,
        fontWeight: '600',
        flex: 1,
    },
});
