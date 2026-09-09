// radius-frontend/app/(app)/home/actions/sales_floor/FillReport.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { TopSafeAreaView } from '@/components/common/TopSafeAreaView';
import HeaderComponent from '@/components/common/HeaderComponent';
import BackButton from '@/components/common/BackButton';
import { FillReportItem } from '@/components/reports/FillReportItem';
import { getFillReport } from '@/api/reports.api';
import {
    FillReportFilterType,
    FillReportItemDetail,
    FillReportResponse,
    FillReportSortBy,
} from '@/types/report.types';
import { COLORS } from '@/constants/colors';
import { globalStyles } from '@/constants/styles';

const FILTER_TABS: { id: FillReportFilterType; label: string; icon: string }[] = [
    { id: 'ALL', label: 'All Items', icon: 'grid-outline' },
    { id: 'TRANSACTIONS', label: 'POS Sales', icon: 'cart-outline' },
    { id: 'IS4TC', label: 'IS4TC Holes', icon: 'alert-decagram-outline' },
    { id: 'NEGATIVE', label: 'Negative Stock', icon: 'warning-outline' },
    { id: 'IN_STOCK', label: 'In Stock', icon: 'checkmark-circle-outline' },
];

const SORT_OPTIONS: { id: FillReportSortBy; label: string; defaultOrder: 'ASC' | 'DESC' }[] = [
    { id: 'aisle', label: 'Aisle Order (Recommended)', defaultOrder: 'ASC' },
    { id: 'location', label: 'Bin Location', defaultOrder: 'ASC' },
    { id: 'category', label: 'Category', defaultOrder: 'ASC' },
    { id: 'name', label: 'Product Name', defaultOrder: 'ASC' },
    { id: 'fill_qty', label: 'Fill Qty (High to Low)', defaultOrder: 'DESC' },
    { id: 'on_hand_qty', label: 'On Hand Qty (Low to High)', defaultOrder: 'ASC' },
];

export default function FillReportScreen() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [reportData, setReportData] = useState<FillReportResponse | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FillReportFilterType>('ALL');
    const [activeSort, setActiveSort] = useState<FillReportSortBy>('aisle');
    const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
    const [sortModalVisible, setSortModalVisible] = useState(false);

    const loadFillReport = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const resp = await getFillReport({
                query: searchQuery.trim() || undefined,
                filter_type: activeFilter !== 'ALL' ? activeFilter : undefined,
                sort_by: activeSort,
                sort_order: sortOrder,
            });
            setReportData(resp);
        } catch (err: any) {
            console.error('Failed to load fill report:', err);
            Toast.show({
                type: 'error',
                text1: 'Error Loading Report',
                text2: err?.message || 'Could not retrieve store fill report.',
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [searchQuery, activeFilter, activeSort, sortOrder]);

    useEffect(() => {
        loadFillReport();
    }, [loadFillReport]);

    const onRefresh = () => {
        setRefreshing(true);
        loadFillReport(true);
    };

    const handleSelectSort = (option: typeof SORT_OPTIONS[0]) => {
        setActiveSort(option.id);
        setSortOrder(option.defaultOrder);
        setSortModalVisible(false);
    };

    return (
        <TopSafeAreaView style={[globalStyles.container, { backgroundColor: COLORS.background }]}>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={<Text style={globalStyles.headerTitle}>Fill Report</Text>}
                headerRight={
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => setSortModalVisible(true)}
                            accessibilityLabel="Sort options"
                        >
                            <Ionicons name="filter-outline" size={22} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => loadFillReport(true)}
                            accessibilityLabel="Refresh report"
                        >
                            <Ionicons name="refresh-outline" size={22} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>
                }
            />

            <View style={styles.metricsBar}>
                <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Items to Fill</Text>
                    <Text style={styles.metricValue}>{reportData?.total_items ?? 0}</Text>
                </View>

                <View style={styles.metricDivider} />

                <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Fill Units</Text>
                    <Text style={[styles.metricValue, { color: COLORS.accent }]}>
                        +{reportData?.fill_qty_sum ?? 0}
                    </Text>
                </View>

                <View style={styles.metricDivider} />

                <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>IS4TC Holes</Text>
                    <Text style={[styles.metricValue, { color: COLORS.danger }]}>
                        {reportData?.is4tc_count ?? 0}
                    </Text>
                </View>
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color={COLORS.textSecondary} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by Product Name, SKU, UPC, or Brand..."
                    placeholderTextColor={COLORS.placeholder}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                        <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.filtersWrapper}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filtersScroll}
                >
                    {FILTER_TABS.map((tab) => {
                        const isSelected = activeFilter === tab.id;
                        return (
                            <TouchableOpacity
                                key={tab.id}
                                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                                onPress={() => setActiveFilter(tab.id)}
                            >
                                <Ionicons
                                    name={tab.icon as any}
                                    size={14}
                                    color={isSelected ? '#FFFFFF' : COLORS.textSecondary}
                                />
                                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            <View style={styles.activeSortRow}>
                <Text style={styles.activeSortText}>
                    Sorted by:{' '}
                    <Text style={styles.activeSortBold}>
                        {SORT_OPTIONS.find((s) => s.id === activeSort)?.label || 'Aisle'}
                    </Text>
                </Text>
                <TouchableOpacity
                    style={styles.sortChangeBtn}
                    onPress={() => setSortModalVisible(true)}
                >
                    <Text style={styles.sortChangeText}>Change</Text>
                    <Ionicons name="chevron-down" size={14} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
                <View style={globalStyles.centerElement}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading Fill Report...</Text>
                </View>
            ) : (
                <FlatList
                    data={reportData?.items ?? []}
                    keyExtractor={(item) => `${item.fill_item_id}-${item.product_id}`}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[COLORS.primary]}
                            tintColor={COLORS.primary}
                        />
                    }
                    renderItem={({ item }) => <FillReportItem item={item} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="clipboard-check-outline" size={56} color="#BDBDBD" />
                            <Text style={styles.emptyTitle}>No Products to Fill</Text>
                            <Text style={styles.emptySubtitle}>
                                {searchQuery || activeFilter !== 'ALL'
                                    ? 'No items match your active filters or search query.'
                                    : 'All shelves are restocked! New sales or IS4TC scans will automatically populate here.'}
                            </Text>
                            <TouchableOpacity
                                style={styles.scanHolesBtn}
                                onPress={() => router.push('/(app)/(tabs)/home/actions/sales_floor/IS4TC')}
                            >
                                <Ionicons name="barcode-outline" size={18} color="#FFFFFF" />
                                <Text style={styles.scanHolesBtnText}>Scan Empty Holes (IS4TC)</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            <Modal visible={sortModalVisible} transparent animationType="fade">
                <TouchableOpacity
                    style={globalStyles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setSortModalVisible(false)}
                >
                    <View style={[globalStyles.modalContentWrapper, { padding: 20 }]}>
                        <View style={styles.sortModalHeader}>
                            <Text style={globalStyles.modalName}>Sort Fill Report</Text>
                            <TouchableOpacity onPress={() => setSortModalVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.sortOptionsList}>
                            {SORT_OPTIONS.map((option) => {
                                const isSelected = activeSort === option.id;
                                return (
                                    <TouchableOpacity
                                        key={option.id}
                                        style={[
                                            styles.sortOptionItem,
                                            isSelected && styles.sortOptionItemActive,
                                        ]}
                                        onPress={() => handleSelectSort(option)}
                                    >
                                        <Text
                                            style={[
                                                styles.sortOptionText,
                                                isSelected && styles.sortOptionTextActive,
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                        {isSelected && (
                                            <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </TopSafeAreaView>
    );
}

const styles = StyleSheet.create({
    headerActions: {
        flexDirection: 'row',
        gap: 10,
        marginRight: 15,
    },
    iconBtn: {
        padding: 4,
    },
    metricsBar: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        marginHorizontal: 12,
        marginTop: 10,
        marginBottom: 8,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'space-around',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    metricCard: {
        alignItems: 'center',
        flex: 1,
    },
    metricDivider: {
        width: 1,
        height: '70%',
        backgroundColor: COLORS.border,
    },
    metricLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    metricValue: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        marginHorizontal: 12,
        marginBottom: 8,
        borderRadius: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        height: 42,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: COLORS.textPrimary,
        height: '100%',
    },
    clearBtn: {
        padding: 4,
    },
    filtersWrapper: {
        marginBottom: 6,
    },
    filtersScroll: {
        paddingHorizontal: 12,
        gap: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: COLORS.surface,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    filterChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    filterChipTextActive: {
        color: '#FFFFFF',
    },
    activeSortRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 4,
        marginBottom: 4,
    },
    activeSortText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    activeSortBold: {
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    sortChangeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    sortChangeText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary,
    },
    listContent: {
        paddingHorizontal: 12,
        paddingBottom: 24,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 24,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginTop: 16,
        marginBottom: 6,
    },
    emptySubtitle: {
        fontSize: 13,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 20,
    },
    scanHolesBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 8,
    },
    scanHolesBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    sortModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingBottom: 10,
    },
    sortOptionsList: {
        gap: 6,
    },
    sortOptionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#FAFAFA',
    },
    sortOptionItemActive: {
        backgroundColor: '#FFEBEE',
    },
    sortOptionText: {
        fontSize: 14,
        color: COLORS.textPrimary,
        fontWeight: '500',
    },
    sortOptionTextActive: {
        color: COLORS.primary,
        fontWeight: '700',
    },
});
