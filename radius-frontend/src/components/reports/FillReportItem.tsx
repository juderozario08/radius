import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FillReportItemDetail } from '@/types/report.types';
import { COLORS } from '@/constants/colors';
import { globalStyles } from '@/constants/styles';

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

    const handleAdjustPress = (e: any) => {
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
                        <MaterialCommunityIcons name="alert-decagram" size={14} color="#FFFFFF" />
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
                            <Ionicons name="arrow-up-circle" size={16} color="#FFFFFF" />
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
                            color={isNegative ? COLORS.danger : isZero ? "#E65100" : COLORS.success}
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
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    negativeCard: {
        backgroundColor: '#FAFAFA',
        borderLeftColor: '#9E9E9E',
        borderColor: '#E0E0E0',
        borderWidth: 1,
        borderLeftWidth: 4,
        opacity: 0.9,
    },
    is4tcCard: {
        borderLeftColor: '#D32F2F',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
        flex: 1,
        marginRight: 8,
    },
    aisleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
    },
    aisleText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.accent,
    },
    unassignedBadge: {
        backgroundColor: '#EEEEEE',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    unassignedText: {
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    binBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#F0F0F0',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    binText: {
        fontSize: 11,
        color: COLORS.textSecondary,
        fontFamily: 'monospace',
    },
    brandBadge: {
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    brandText: {
        fontSize: 11,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    redIs4tcBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#D32F2F',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        shadowColor: '#D32F2F',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 2,
    },
    redIs4tcText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    txSourceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
    },
    txSourceText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.success,
    },
    body: {
        marginBottom: 10,
    },
    productName: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
        lineHeight: 22,
        marginBottom: 4,
    },
    negativeTextDim: {
        color: '#616161',
    },
    identifiersRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    skuText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    upcText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    codeText: {
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    bulletDot: {
        color: COLORS.textSecondary,
        fontSize: 10,
    },
    categoryText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
        marginTop: 2,
    },
    quantitiesSection: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
        borderRadius: 8,
        padding: 8,
        gap: 16,
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
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        marginBottom: 3,
    },
    fillQtyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 6,
    },
    fillQtyValue: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    onHandBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    onHandPositive: {
        backgroundColor: '#E8F5E9',
    },
    onHandZero: {
        backgroundColor: '#FFF3E0',
    },
    onHandNegative: {
        backgroundColor: '#FFEBEE',
    },
    onHandValue: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    onHandTextPositive: {
        color: COLORS.success,
    },
    onHandTextZero: {
        color: '#E65100',
    },
    onHandTextNegative: {
        color: COLORS.danger,
    },
    availableValue: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textPrimary,
        paddingVertical: 3,
    },
    negativeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFEBEE',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 6,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#FFCDD2',
    },
    negativeBannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    negativeBannerText: {
        fontSize: 12,
        color: COLORS.danger,
        fontWeight: '600',
        flex: 1,
    },
});
