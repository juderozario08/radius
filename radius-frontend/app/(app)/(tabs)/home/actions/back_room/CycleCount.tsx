import React, { useEffect, useState, useCallback } from "react";
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
import { globalStyles } from "@/constants/styles";
import { useAuth } from "@/hooks/useAuth";
import { callApi } from "@/utils/helpers";
import { router, useFocusEffect } from "expo-router";
import { CycleCountSummary, CycleCountStatus } from "@/types/cyclecount.types";
import { Category } from "@/types/inventory.types";
import { Ionicons } from "@expo/vector-icons";

export const getCycleCountStatusStyle = (status: CycleCountStatus) => {
    switch (status) {
        case "IN PROGRESS":
            return { bg: "#E3F2FD", text: "#1565C0", border: "#90CAF9" };
        case "PENDING APPROVAL":
            return { bg: "#FFF8E1", text: "#F57F17", border: "#FFE082" };
        case "APPROVED":
            return { bg: "#E8F5E9", text: "#2E7D32", border: "#A5D6A7" };
        case "COMPLETED":
            return { bg: "#E8F5E9", text: "#2E7D32", border: "#A5D6A7" };
        case "NOT STARTED":
        default:
            return { bg: "#F5F5F5", text: "#757575", border: "#E0E0E0" };
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
        try {
            setError(null);
            const data = await callApi<CycleCountSummary[]>(
                ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.getWeekly,
                { method: "GET" },
                logout
            );
            if (data) {
                setCounts(data);
            }
        } catch (err: any) {
            setError(err.message || "Failed to load cycle counts");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [logout]);

    const fetchCategories = useCallback(async () => {
        try {
            const data = await callApi<Category[]>(
                ENDPOINTS.SALES_FLOOR.PRODUCTS.categories,
                { method: "GET" },
                logout
            );
            if (data) {
                setCategories(data);
            }
        } catch (err) {
            console.error("Failed to fetch categories:", err);
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
        try {
            const res = await callApi<{ count_id: number }>(
                ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.start,
                {
                    method: "POST",
                    body: JSON.stringify({ category_id: selectedCategoryId }),
                },
                logout
            );
            setModalVisible(false);
            setSelectedCategoryId(null);
            if (res && res.count_id) {
                router.push({
                    pathname: "/(app)/(tabs)/home/actions/back_room/CycleCountDetail",
                    params: { id: res.count_id },
                });
            } else {
                fetchWeeklyCounts();
            }
        } catch (err: any) {
            alert(err.message || "Failed to start count");
        } finally {
            setIsStarting(false);
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
                            {item.total_variance_cost < 0 ? "-" : "+"}$
                            {Math.abs(item.total_variance_cost).toFixed(2)}
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
                        <ActivityIndicator size="large" color={COLORS.primary} />
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
                                    Tap "Start New Count" to begin counting inventory for a category.
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
                    <Ionicons name="add" size={24} color="#FFF" />
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
                                    <ActivityIndicator size="small" color="#FFF" />
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
        gap: 14,
    },
    headerIconButton: {
        padding: 4,
    },
    sectionHeader: {
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sectionHeaderTitle: {
        fontSize: 12,
        fontWeight: "700",
        color: COLORS.textSecondary,
        letterSpacing: 0.8,
    },
    sectionHeaderSub: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    listContent: {
        padding: 16,
        paddingBottom: 90,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        padding: 16,
        marginBottom: 14,
        shadowColor: "#000",
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
        marginRight: 12,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    cardSubtitle: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 3,
    },
    totalBadge: {
        borderWidth: 1.5,
        borderColor: "#FFCC80",
        backgroundColor: "#FFF8E1",
        borderRadius: 8,
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    totalBadgeText: {
        fontSize: 15,
        fontWeight: "700",
        color: "#E65100",
    },
    statusAndDateRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 10,
    },
    statusPill: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
        borderWidth: 1,
        alignSelf: "flex-start",
    },
    statusPillText: {
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
    },
    dateText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    progressContainer: {
        marginTop: 14,
    },
    progressLabelRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    progressLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: "500",
    },
    progressPctText: {
        fontSize: 12,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    progressBarTrack: {
        height: 6,
        backgroundColor: "#E0E0E0",
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
        marginTop: 10,
        gap: 6,
    },
    varianceSummaryLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    varianceSummaryValue: {
        fontSize: 13,
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
        paddingVertical: 14,
        paddingHorizontal: 22,
        borderRadius: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 6,
        gap: 8,
    },
    fabText: {
        color: "#FFFFFF",
        fontWeight: "700",
        fontSize: 15,
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
        paddingHorizontal: 24,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginTop: 12,
    },
    emptySub: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: "center",
        marginTop: 6,
        lineHeight: 20,
    },
    retryButton: {
        marginTop: 14,
        backgroundColor: COLORS.primary,
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderRadius: 8,
    },
    retryButtonText: {
        color: "#FFF",
        fontWeight: "600",
    },
    modalScroll: {
        maxHeight: 260,
        marginVertical: 12,
    },
    categoryOption: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 8,
        gap: 12,
    },
    categoryOptionSelected: {
        borderColor: COLORS.primary,
        backgroundColor: "#FFEBEE",
    },
    categoryOptionText: {
        fontSize: 15,
        color: COLORS.textPrimary,
        fontWeight: "500",
    },
    categoryOptionTextSelected: {
        color: COLORS.primary,
        fontWeight: "700",
    },
    modalActionButton: {
        marginTop: 8,
    },
});
