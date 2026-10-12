import React, { useState, useCallback, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import HeaderComponent from "@/components/common/HeaderComponent";
import BackButton from "@/components/common/BackButton";
import { ENDPOINTS } from "@/constants/routes";
import { COLORS } from "@/constants/colors";
import { globalStyles, SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";
import { useAuth } from "@/hooks/useAuth";
import { callApi } from "@/utils/helpers";
import { router } from "expo-router";
import { CycleCountSummary } from "@/types/cyclecount.types";
import { getCycleCountStatusStyle } from "./CycleCount";
import { Ionicons } from "@expo/vector-icons";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { formatSignedMoney, sumMoney } from "@/utils/money";

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
    const abortControllerRef = React.useRef<AbortController | null>(null);

    const performSearch = useCallback(
        async (searchQuery: string, status: string, signal?: AbortSignal) => {
            setIsLoading(true);
            try {
                const params = new URLSearchParams();
                if (searchQuery.trim()) params.append("query", searchQuery.trim());
                if (status && status !== "ALL") params.append("status", status);

                const url = `${ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.search}?${params.toString()}`;
                const data = await callApi<CycleCountSummary[]>(url, { method: "GET", signal }, logout);
                if (signal?.aborted) {
                    return;
                }
                if (data) {
                    setResults(data);
                }
            } finally {
                if (!signal?.aborted) {
                    setIsLoading(false);
                    setHasSearched(true);
                }
            }
        },
        [logout]
    );

    useEffect(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const timer = setTimeout(() => {
            performSearch(query, statusFilter, controller.signal);
        }, 300);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query, statusFilter, performSearch]);

    const totalNetVariance = sumMoney(results.map((item) => item.total_variance_cost));
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
                            {formatSignedMoney(item.total_variance_cost)}
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
                                {formatSignedMoney(totalNetVariance)}
                            </Text>
                            <Text style={styles.reportSummaryLabel}>Net Financial Impact</Text>
                        </View>
                    </View>
                )}

                {isLoading ? (
                    <View style={globalStyles.centerElement}>
                        <LoadingSpinner />
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
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.md,
        paddingBottom: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    searchInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.inputBg,
        borderRadius: RADIUS.mdl,
        paddingHorizontal: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        gap: SPACING.sm,
    },
    searchInput: {
        flex: 1,
        height: 44,
        fontSize: FONT_SIZE.md,
        color: COLORS.textPrimary,
    },
    filterPillsContainer: {
        flexDirection: "row",
        gap: SPACING.sm,
        paddingVertical: SPACING.smd,
    },
    filterPill: {
        paddingHorizontal: SPACING.mdl,
        paddingVertical: SPACING.xsm,
        borderRadius: RADIUS.xlPlus,
        backgroundColor: COLORS.neutralBg,
    },
    filterPillActive: {
        backgroundColor: COLORS.primary,
    },
    filterPillText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    filterPillTextActive: {
        color: COLORS.surface,
    },
    reportSummaryStrip: {
        flexDirection: "row",
        backgroundColor: COLORS.surface,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        justifyContent: "space-around",
        alignItems: "center",
    },
    reportSummaryCol: {
        alignItems: "center",
    },
    reportSummaryVal: {
        fontSize: FONT_SIZE.lg,
        fontWeight: "800",
        color: COLORS.textPrimary,
    },
    reportSummaryLabel: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textSecondary,
        marginTop: SPACING.xxs,
    },
    reportSummaryDivider: {
        width: 1,
        height: 24,
        backgroundColor: COLORS.border,
    },
    listContent: {
        padding: SPACING.lg,
        paddingBottom: SPACING.xxlPlus,
        gap: SPACING.md,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: SPACING.md,
    },
    cardTitle: {
        fontSize: FONT_SIZE.lg,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    cardSubtitle: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textSecondary,
        marginTop: SPACING.xxs,
    },
    statusPill: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.micro,
        borderRadius: RADIUS.mdl,
        borderWidth: 1,
    },
    statusPillText: {
        fontSize: FONT_SIZE.xxs,
        fontWeight: "700",
        textTransform: "uppercase",
    },
    cardDetailsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingTop: SPACING.smd,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    detailCol: {
        flex: 1,
    },
    detailLabel: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xxs,
    },
    detailVal: {
        fontSize: FONT_SIZE.smd,
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
        paddingHorizontal: SPACING.xxl,
    },
    emptyTitle: {
        fontSize: FONT_SIZE.lg,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginTop: SPACING.md,
    },
    emptySub: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textSecondary,
        textAlign: "center",
        marginTop: SPACING.xs,
    },
});
