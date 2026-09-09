// radius-frontend/app/(app)/home/actions/back_room/CycleCountSearch.tsx
import React, { useState, useCallback, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import HeaderComponent from "@/components/common/HeaderComponent";
import BackButton from "@/components/common/BackButton";
import { ENDPOINTS } from "@/constants/routes";
import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";
import { useAuth } from "@/hooks/useAuth";
import { callApi } from "@/utils/helpers";
import { router } from "expo-router";
import { CycleCountSummary, CycleCountStatus } from "@/types/cyclecount.types";
import { getCycleCountStatusStyle } from "./CycleCount";
import { Ionicons } from "@expo/vector-icons";

const STATUS_FILTERS: { label: string; value: string }[] = [
    { label: "All", value: "ALL" },
    { label: "In Progress", value: "IN PROGRESS" },
    { label: "Pending", value: "PENDING APPROVAL" },
    { label: "Approved", value: "APPROVED" },
    { label: "Completed", value: "COMPLETED" },
];

export default function CycleCountSearch() {
    const { logout } = useAuth();
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [results, setResults] = useState<CycleCountSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const performSearch = useCallback(
        async (searchQuery: string, status: string) => {
            setIsLoading(true);
            try {
                const params = new URLSearchParams();
                if (searchQuery.trim()) params.append("query", searchQuery.trim());
                if (status && status !== "ALL") params.append("status", status);

                const url = `${ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.search}?${params.toString()}`;
                const data = await callApi<CycleCountSummary[]>(url, { method: "GET" }, logout);
                if (data) {
                    setResults(data);
                }
            } catch (err) {
                console.error("Search failed:", err);
            } finally {
                setIsLoading(false);
                setHasSearched(true);
            }
        },
        [logout]
    );

    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(query, statusFilter);
        }, 300);
        return () => clearTimeout(timer);
    }, [query, statusFilter, performSearch]);

    const totalNetVariance = results.reduce(
        (sum, item) => sum + (item.total_variance_cost || 0),
        0
    );
    const countsWithVariance = results.filter(
        (item) => item.total_variance_cost !== 0
    ).length;

    const renderSummaryCard = ({ item }: { item: CycleCountSummary }) => {
        const statusStyle = getCycleCountStatusStyle(item.status);

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
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>
                            High Ticket #{item.count_id}
                        </Text>
                        <Text style={styles.cardSubtitle}>
                            {item.category_name} • {item.counted_by_name || "Unassigned"}
                        </Text>
                    </View>
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
                </View>

                <View style={styles.cardDetailsRow}>
                    <View style={styles.detailCol}>
                        <Text style={styles.detailLabel}>Items Counted</Text>
                        <Text style={styles.detailVal}>
                            {item.counted_items} / {item.total_items}
                        </Text>
                    </View>

                    <View style={styles.detailCol}>
                        <Text style={styles.detailLabel}>Date</Text>
                        <Text style={styles.detailVal}>
                            {item.count_date
                                ? new Date(item.count_date).toLocaleDateString(undefined, {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                  })
                                : "—"}
                        </Text>
                    </View>

                    <View style={[styles.detailCol, { alignItems: "flex-end" }]}>
                        <Text style={styles.detailLabel}>Variance Impact</Text>
                        <Text
                            style={[
                                styles.detailVal,
                                item.total_variance_cost < 0
                                    ? styles.varNegative
                                    : item.total_variance_cost > 0
                                    ? styles.varPositive
                                    : styles.varNeutral,
                            ]}
                        >
                            {item.total_variance_cost === 0
                                ? "$0.00"
                                : `${item.total_variance_cost < 0 ? "-" : "+"}$${Math.abs(
                                      item.total_variance_cost
                                  ).toFixed(2)}`}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={<Text style={globalStyles.headerTitle}>Search & Reports</Text>}
            />

            <View style={styles.container}>
                <View style={styles.searchSection}>
                    <View style={styles.searchInputContainer}>
                        <Ionicons name="search" size={20} color={COLORS.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by ID, Category, or Employee..."
                            placeholderTextColor={COLORS.placeholder}
                            value={query}
                            onChangeText={setQuery}
                            autoCapitalize="none"
                            returnKeyType="search"
                        />
                        {query.length > 0 && (
                            <TouchableOpacity onPress={() => setQuery("")}>
                                <Ionicons name="close-circle" size={18} color={COLORS.inactiveTint} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <FlatList
                        horizontal
                        data={STATUS_FILTERS}
                        keyExtractor={(item) => item.value}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterPillsContainer}
                        renderItem={({ item }) => {
                            const isSelected = statusFilter === item.value;
                            return (
                                <TouchableOpacity
                                    style={[
                                        styles.filterPill,
                                        isSelected && styles.filterPillActive,
                                    ]}
                                    onPress={() => setStatusFilter(item.value)}
                                >
                                    <Text
                                        style={[
                                            styles.filterPillText,
                                            isSelected && styles.filterPillTextActive,
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>

                {results.length > 0 && (
                    <View style={styles.reportSummaryStrip}>
                        <View style={styles.reportSummaryCol}>
                            <Text style={styles.reportSummaryVal}>{results.length}</Text>
                            <Text style={styles.reportSummaryLabel}>Counts Found</Text>
                        </View>
                        <View style={styles.reportSummaryDivider} />
                        <View style={styles.reportSummaryCol}>
                            <Text style={styles.reportSummaryVal}>{countsWithVariance}</Text>
                            <Text style={styles.reportSummaryLabel}>With Variance</Text>
                        </View>
                        <View style={styles.reportSummaryDivider} />
                        <View style={styles.reportSummaryCol}>
                            <Text
                                style={[
                                    styles.reportSummaryVal,
                                    totalNetVariance < 0
                                        ? styles.varNegative
                                        : totalNetVariance > 0
                                        ? styles.varPositive
                                        : styles.varNeutral,
                                ]}
                            >
                                {totalNetVariance === 0
                                    ? "$0.00"
                                    : `${totalNetVariance < 0 ? "-" : "+"}$${Math.abs(
                                          totalNetVariance
                                      ).toFixed(2)}`}
                            </Text>
                            <Text style={styles.reportSummaryLabel}>Net Financial Impact</Text>
                        </View>
                    </View>
                )}

                {isLoading ? (
                    <View style={globalStyles.centerElement}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={results}
                        keyExtractor={(item) => item.count_id.toString()}
                        renderItem={renderSummaryCard}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            hasSearched ? (
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="search-outline" size={56} color={COLORS.inactiveTint} />
                                    <Text style={styles.emptyTitle}>No matching counts found</Text>
                                    <Text style={styles.emptySub}>
                                        Try adjusting your search keywords or filter status.
                                    </Text>
                                </View>
                            ) : null
                        }
                    />
                )}
            </View>
        </TopSafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    searchSection: {
        backgroundColor: COLORS.surface,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    searchInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.inputBg,
        borderRadius: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        height: 44,
        fontSize: 14,
        color: COLORS.textPrimary,
    },
    filterPillsContainer: {
        flexDirection: "row",
        gap: 8,
        paddingVertical: 10,
    },
    filterPill: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 18,
        backgroundColor: "#F0F0F0",
    },
    filterPillActive: {
        backgroundColor: COLORS.primary,
    },
    filterPillText: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    filterPillTextActive: {
        color: "#FFFFFF",
    },
    reportSummaryStrip: {
        flexDirection: "row",
        backgroundColor: COLORS.surface,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        justifyContent: "space-around",
        alignItems: "center",
    },
    reportSummaryCol: {
        alignItems: "center",
    },
    reportSummaryVal: {
        fontSize: 16,
        fontWeight: "800",
        color: COLORS.textPrimary,
    },
    reportSummaryLabel: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    reportSummaryDivider: {
        width: 1,
        height: 24,
        backgroundColor: COLORS.border,
    },
    listContent: {
        padding: 16,
        paddingBottom: 30,
        gap: 12,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    cardSubtitle: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    statusPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        borderWidth: 1,
    },
    statusPillText: {
        fontSize: 10,
        fontWeight: "700",
        textTransform: "uppercase",
    },
    cardDetailsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    detailCol: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    detailVal: {
        fontSize: 13,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    varNegative: {
        color: COLORS.error,
    },
    varPositive: {
        color: COLORS.success,
    },
    varNeutral: {
        color: COLORS.textPrimary,
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
        paddingHorizontal: 24,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginTop: 12,
    },
    emptySub: {
        fontSize: 13,
        color: COLORS.textSecondary,
        textAlign: "center",
        marginTop: 4,
    },
});
