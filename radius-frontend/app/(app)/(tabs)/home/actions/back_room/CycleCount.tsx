import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    ScrollView,
    RefreshControl,
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import HeaderComponent from "@/components/common/HeaderComponent";
import BackButton from "@/components/common/BackButton";
import { ENDPOINTS } from "@/constants/routes";
import { COLORS } from "@/constants/colors";
import { globalStyles, SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";
import { useAuth } from "@/hooks/useAuth";
import { callApi } from "@/utils/helpers";
import { router, useFocusEffect } from "expo-router";
import { CycleCountSummary, CycleCountStatus } from "@/types/cyclecount.types";
import { Category } from "@/types/inventory.types";
import { Ionicons } from "@expo/vector-icons";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { formatSignedMoney } from "@/utils/money";

export const getCycleCountStatusStyle = (status: CycleCountStatus) => {
    switch (status) {
        case "IN PROGRESS":
            return { bg: COLORS.infoBg, text: COLORS.info, border: COLORS.infoBorder };
        case "PENDING APPROVAL":
            return { bg: COLORS.pendingBg, text: COLORS.pending, border: COLORS.pendingBorder };
        case "APPROVED":
            return { bg: COLORS.activeBg, text: COLORS.success, border: COLORS.successBorder };
        case "COMPLETED":
            return { bg: COLORS.activeBg, text: COLORS.success, border: COLORS.successBorder };
        case "NOT STARTED":
        default:
            return { bg: COLORS.background, text: COLORS.textSecondary, border: COLORS.inputBorder };
    }
};

export default function CycleCountDashboard() {
    const { logout } = useAuth();
    const [counts, setCounts] = useState<CycleCountSummary[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [isStarting, setIsStarting] = useState(false);

    const fetchWeeklyCounts = useCallback(async () => {
        setError(null);
        const data = await callApi<CycleCountSummary[]>(
            ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.getWeekly,
            { method: "GET" },
            logout
        );
        if (data) {
            setCounts(data);
        } else {
            setError("Failed to load cycle counts");
        }
        setIsLoading(false);
        setIsRefreshing(false);
    }, [logout]);

    const fetchCategories = useCallback(async () => {
        const data = await callApi<Category[]>(
            ENDPOINTS.SALES_FLOOR.PRODUCTS.categories,
            { method: "GET", swr: true },
            logout
        );
        if (data) {
            setCategories(data);
        }
    }, [logout]);

    useFocusEffect(
        useCallback(() => {
            fetchWeeklyCounts();
            fetchCategories();
        }, [fetchWeeklyCounts, fetchCategories])
    );

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchWeeklyCounts();
    };

    const handleStartCount = async () => {
        if (!selectedCategoryId) return;
        setIsStarting(true);
        const res = await callApi<{ count_id: number }>(
            ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.start,
            {
                method: "POST",
                body: JSON.stringify({ category_id: selectedCategoryId }),
            },
            logout
        );
        setIsStarting(false);
        if (res === null) return;
        setModalVisible(false);
        setSelectedCategoryId(null);
        if (res.count_id) {
            router.push({
                pathname: "/(app)/(tabs)/home/actions/back_room/CycleCountDetail",
                params: { id: res.count_id },
            });
        } else {
            fetchWeeklyCounts();
        }
    };

    const renderHeaderRight = () => (
        <View style={styles.headerRightContainer}>
            <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => router.push("/(app)/(tabs)/home/actions/back_room/CycleCountSearch")}
            >
                <Ionicons name="search-outline" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => router.push("/(app)/(tabs)/home/actions/back_room/CycleCountCalendar")}
            >
                <Ionicons name="calendar-outline" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
        </View>
    );

    const renderCountItem = ({ item }: { item: CycleCountSummary }) => {
        const statusStyle = getCycleCountStatusStyle(item.status);
        const progressPct =
            item.total_items > 0
                ? Math.min(100, Math.round((item.counted_items / item.total_items) * 100))
                : 0;

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() =>
                    router.push({
                        pathname: "/(app)/(tabs)/home/actions/back_room/CycleCountDetail",
                        params: { id: item.count_id },
                    })
                }
            >
                <View style={styles.cardTopRow}>
                    <View style={styles.cardTitleCol}>
                        <Text style={styles.cardTitle}>
                            Count #{item.count_id}
                        </Text>
                        <Text style={styles.cardSubtitle}>
                            {item.category_name} • {item.counted_by_name ? `Assigned to ${item.counted_by_name}` : "Unassigned"}
                        </Text>
                    </View>
                    <View style={styles.totalBadge}>
                        <Text style={styles.totalBadgeText}>{item.total_items} Items</Text>
                    </View>
                </View>

                <View style={styles.statusAndDateRow}>
                    <View
                        style={[
                            styles.statusPill,
                            { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
                        ]}
                    >
                        <Text style={[styles.statusPillText, { color: statusStyle.text }]}>
                            {item.status}
                        </Text>
                    </View>
                    {item.count_date && (
                        <Text style={styles.dateText}>
                            {new Date(item.count_date).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                            })}
                        </Text>
                    )}
                </View>

                <View style={styles.progressContainer}>
                    <View style={styles.progressLabelRow}>
                        <Text style={styles.progressLabel}>
                            {item.counted_items} of {item.total_items} items counted
                        </Text>
                        <Text style={styles.progressPctText}>{progressPct}%</Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                        <View
                            style={[
                                styles.progressBarFill,
                                {
                                    width: `${progressPct}%`,
                                    backgroundColor:
                                        item.status === "APPROVED" || item.status === "COMPLETED"
                                            ? COLORS.success
                                            : COLORS.primary,
                                },
                            ]}
                        />
                    </View>
                </View>

                {item.total_variance_cost !== 0 && (
                    <View style={styles.varianceSummaryRow}>
                        <Text style={styles.varianceSummaryLabel}>Variance Cost:</Text>
                        <Text
                            style={[
                                styles.varianceSummaryValue,
                                item.total_variance_cost < 0
                                    ? styles.varianceNegative
                                    : styles.variancePositive,
                            ]}
                        >
                            {formatSignedMoney(item.total_variance_cost)}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={<Text style={globalStyles.headerTitle}>Cycle Count</Text>}
                headerRight={renderHeaderRight()}
            />

            <View style={styles.container}>
                {isLoading ? (
                    <View style={globalStyles.centerElement}>
                        <LoadingSpinner />
                    </View>
                ) : error ? (
                    <View style={globalStyles.centerElement}>
                        <Text style={globalStyles.errorText}>{error}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={fetchWeeklyCounts}>
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={counts}
                        keyExtractor={(item) => item.count_id.toString()}
                        renderItem={renderCountItem}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
                        }
                        ListHeaderComponent={
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionHeaderTitle}>
                                    ACTIVE COUNTS FOR THIS WEEK
                                </Text>
                                <Text style={styles.sectionHeaderSub}>
                                    {counts.length} {counts.length === 1 ? "count" : "counts"} scheduled / active
                                </Text>
                            </View>
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="clipboard-outline" size={56} color={COLORS.inactiveTint} />
                                <Text style={styles.emptyTitle}>No active cycle counts</Text>
                                <Text style={styles.emptySub}>
                                    Tap &quot;Start New Count&quot; to begin counting inventory for a category.
                                </Text>
                            </View>
                        }
                    />
                )}

                <TouchableOpacity
                    style={styles.fab}
                    activeOpacity={0.85}
                    onPress={() => setModalVisible(true)}
                >
                    <Ionicons name="add" size={24} color={COLORS.surface} />
                    <Text style={styles.fabText}>Start New Count</Text>
                </TouchableOpacity>
            </View>

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={globalStyles.modalOverlay}>
                    <View style={[globalStyles.modalContentWrapper, { maxHeight: "80%" }]}>
                        <View style={globalStyles.modalCardContainer}>
                            <View style={globalStyles.modalHeader}>
                                <View>
                                    <Text style={globalStyles.modalTitle}>Start Cycle Count</Text>
                                    <Text style={globalStyles.modalSubtitle}>
                                        Select a category to begin counting
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.modalScroll}>
                                {categories.map((cat) => {
                                    const isSelected = selectedCategoryId === cat.category_id;
                                    return (
                                        <TouchableOpacity
                                            key={cat.category_id}
                                            style={[
                                                styles.categoryOption,
                                                isSelected && styles.categoryOptionSelected,
                                            ]}
                                            onPress={() => setSelectedCategoryId(cat.category_id)}
                                        >
                                            <Ionicons
                                                name={isSelected ? "radio-button-on" : "radio-button-off"}
                                                size={20}
                                                color={isSelected ? COLORS.primary : COLORS.inactiveTint}
                                            />
                                            <Text
                                                style={[
                                                    styles.categoryOptionText,
                                                    isSelected && styles.categoryOptionTextSelected,
                                                ]}
                                            >
                                                {cat.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            <TouchableOpacity
                                style={[
                                    globalStyles.buttonPrimary,
                                    styles.modalActionButton,
                                    (!selectedCategoryId || isStarting) && { opacity: 0.6 },
                                ]}
                                disabled={!selectedCategoryId || isStarting}
                                onPress={handleStartCount}
                            >
                                {isStarting ? (
                                    <ActivityIndicator size="small" color={COLORS.surface} />
                                ) : (
                                    <Text style={globalStyles.buttonTextPrimary}>Start Counting</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </TopSafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    headerRightContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.mdl,
    },
    headerIconButton: {
        padding: SPACING.xs,
    },
    sectionHeader: {
        marginBottom: SPACING.md,
        paddingHorizontal: SPACING.xs,
    },
    sectionHeaderTitle: {
        fontSize: FONT_SIZE.sm,
        fontWeight: "700",
        color: COLORS.textSecondary,
        letterSpacing: 0.8,
    },
    sectionHeaderSub: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textSecondary,
        marginTop: SPACING.xxs,
    },
    listContent: {
        padding: SPACING.lg,
        paddingBottom: 90,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lgPlus,
        padding: SPACING.lg,
        marginBottom: SPACING.mdl,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    cardTitleCol: {
        flex: 1,
        marginRight: SPACING.md,
    },
    cardTitle: {
        fontSize: FONT_SIZE.lgPlus,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    cardSubtitle: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textSecondary,
        marginTop: SPACING.micro,
    },
    totalBadge: {
        borderWidth: 1.5,
        borderColor: COLORS.warningBorder,
        backgroundColor: COLORS.pendingBg,
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.smd,
    },
    totalBadgeText: {
        fontSize: FONT_SIZE.mdl,
        fontWeight: "700",
        color: COLORS.warning,
    },
    statusAndDateRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: SPACING.smd,
    },
    statusPill: {
        paddingHorizontal: SPACING.smd,
        paddingVertical: SPACING.micro,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        alignSelf: "flex-start",
    },
    statusPillText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: "700",
        textTransform: "uppercase",
    },
    dateText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
    },
    progressContainer: {
        marginTop: SPACING.mdl,
    },
    progressLabelRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: SPACING.xsm,
    },
    progressLabel: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        fontWeight: "500",
    },
    progressPctText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    progressBarTrack: {
        height: 6,
        backgroundColor: COLORS.inputBorder,
        borderRadius: 3,
        overflow: "hidden",
    },
    progressBarFill: {
        height: "100%",
        borderRadius: 3,
    },
    varianceSummaryRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        marginTop: SPACING.smd,
        gap: SPACING.xsm,
    },
    varianceSummaryLabel: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
    },
    varianceSummaryValue: {
        fontSize: FONT_SIZE.smd,
        fontWeight: "700",
    },
    varianceNegative: {
        color: COLORS.error,
    },
    variancePositive: {
        color: COLORS.success,
    },
    fab: {
        position: "absolute",
        bottom: 24,
        right: 20,
        backgroundColor: COLORS.primary,
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: SPACING.mdl,
        paddingHorizontal: SPACING.xlPlus,
        borderRadius: 30,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 6,
        gap: SPACING.sm,
    },
    fabText: {
        color: COLORS.surface,
        fontWeight: "700",
        fontSize: FONT_SIZE.mdl,
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
        paddingHorizontal: SPACING.xxl,
    },
    emptyTitle: {
        fontSize: FONT_SIZE.lgPlus,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginTop: SPACING.md,
    },
    emptySub: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        textAlign: "center",
        marginTop: SPACING.xsm,
        lineHeight: 20,
    },
    retryButton: {
        marginTop: SPACING.mdl,
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.lgPlus,
        borderRadius: RADIUS.md,
    },
    retryButtonText: {
        color: COLORS.surface,
        fontWeight: "600",
    },
    modalScroll: {
        maxHeight: 260,
        marginVertical: SPACING.md,
    },
    categoryOption: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: SPACING.sm,
        gap: SPACING.md,
    },
    categoryOptionSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.inactiveBg,
    },
    categoryOptionText: {
        fontSize: FONT_SIZE.mdl,
        color: COLORS.textPrimary,
        fontWeight: "500",
    },
    categoryOptionTextSelected: {
        color: COLORS.primary,
        fontWeight: "700",
    },
    modalActionButton: {
        marginTop: SPACING.sm,
    },
});
