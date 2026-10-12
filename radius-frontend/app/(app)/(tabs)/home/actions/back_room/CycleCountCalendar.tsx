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
    Alert,
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
import { CycleCountScheduleEntry } from "@/types/cyclecount.types";
import { Category } from "@/types/inventory.types";
import { Ionicons } from "@expo/vector-icons";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface WeekGroup {
    weekKey: string;
    weekLabel: string;
    startDate: Date;
    endDate: Date;
    isCurrentWeek: boolean;
    entries: CycleCountScheduleEntry[];
}

function getMondayOfWeek(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

function getSundayOfWeek(monday: Date): Date {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return sunday;
}

function formatWeekLabel(monday: Date, sunday: Date): string {
    const startStr = monday.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const endStr = sunday.toLocaleDateString(undefined, {
        month: monday.getMonth() === sunday.getMonth() ? undefined : "short",
        day: "numeric",
        year: "numeric",
    });
    return `Week of ${startStr} – ${endStr}`;
}

export default function CycleCountCalendar() {
    const { logout, user } = useAuth();
    const [schedule, setSchedule] = useState<CycleCountScheduleEntry[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
    const [selectedWeekOffset, setSelectedWeekOffset] = useState<number>(0);
    const [isSaving, setIsSaving] = useState(false);

    const isManagerOrAdmin = user?.role === "MANAGER" || user?.role === "ADMIN";

    const fetchSchedule = useCallback(async () => {
        setError(null);
        const data = await callApi<CycleCountScheduleEntry[]>(
            ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.schedule,
            { method: "GET" },
            logout
        );
        if (data) {
            setSchedule(data);
        } else {
            setError("Failed to load schedule");
        }
        setIsLoading(false);
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
            fetchSchedule();
            fetchCategories();
        }, [fetchSchedule, fetchCategories])
    );

    const handleCreateSchedule = async () => {
        if (!selectedCatId) {
            Alert.alert("Validation", "Please select a category");
            return;
        }

        const now = new Date();
        const baseMonday = getMondayOfWeek(now);
        baseMonday.setDate(baseMonday.getDate() + selectedWeekOffset * 7);
        const scheduledDateStr = baseMonday.toISOString().split("T")[0];

        setIsSaving(true);
        const res = await callApi(
            ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.schedule,
            {
                method: "POST",
                body: JSON.stringify({
                    category_id: selectedCatId,
                    scheduled_date: scheduledDateStr,
                }),
            },
            logout
        );
        setIsSaving(false);
        if (res === null) return;
        setModalVisible(false);
        setSelectedCatId(null);
        setSelectedWeekOffset(0);
        fetchSchedule();
        Alert.alert("Success", "Cycle count scheduled for the selected week!");
    };

    const currentWeekMonday = getMondayOfWeek(new Date()).toISOString().split("T")[0];

    const weekMap = new Map<string, WeekGroup>();

    schedule.forEach((entry) => {
        const rawDate = new Date(entry.scheduled_date.split("T")[0] + "T00:00:00");
        const monday = getMondayOfWeek(rawDate);
        const sunday = getSundayOfWeek(monday);
        const weekKey = monday.toISOString().split("T")[0];

        if (!weekMap.has(weekKey)) {
            weekMap.set(weekKey, {
                weekKey,
                weekLabel: formatWeekLabel(monday, sunday),
                startDate: monday,
                endDate: sunday,
                isCurrentWeek: weekKey === currentWeekMonday,
                entries: [],
            });
        }
        weekMap.get(weekKey)!.entries.push(entry);
    });

    const sortedWeeks = Array.from(weekMap.values()).sort(
        (a, b) => a.startDate.getTime() - b.startDate.getTime()
    );

    const weekOptions = [0, 1, 2, 3, 4].map((offset) => {
        const d = new Date();
        const monday = getMondayOfWeek(d);
        monday.setDate(monday.getDate() + offset * 7);
        const sunday = getSundayOfWeek(monday);
        let title = offset === 0 ? "This Week" : offset === 1 ? "Next Week" : `In ${offset} Weeks`;
        return {
            offset,
            title,
            subtitle: `${monday.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${sunday.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
        };
    });

    const renderWeekGroup = ({ item: week }: { item: WeekGroup }) => {
        return (
            <View style={styles.weekGroupCard}>
                <View style={styles.weekHeaderRow}>
                    <View style={styles.weekTitleCol}>
                        <View style={styles.weekIconRow}>
                            <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                            <Text style={styles.weekTitleText}>{week.weekLabel}</Text>
                        </View>
                    </View>

                    {week.isCurrentWeek && (
                        <View style={styles.currentWeekBadge}>
                            <Text style={styles.currentWeekBadgeText}>CURRENT WEEK</Text>
                        </View>
                    )}
                </View>

                <View style={styles.entriesContainer}>
                    {week.entries.map((entry) => {
                        const hasStarted = !!entry.cycle_count_id;
                        return (
                            <TouchableOpacity
                                key={entry.schedule_id}
                                style={styles.entryRow}
                                activeOpacity={0.7}
                                onPress={() => {
                                    if (hasStarted) {
                                        router.push({
                                            pathname:
                                                "/(app)/(tabs)/home/actions/back_room/CycleCountDetail",
                                            params: { id: entry.cycle_count_id },
                                        });
                                    } else {
                                        Alert.alert(
                                            "Start Week Count",
                                            `Would you like to start the count for ${entry.category_name} for this week?`,
                                            [
                                                { text: "Cancel", style: "cancel" },
                                                {
                                                    text: "Start Count",
                                                    onPress: async () => {
                                                        const res = await callApi<{
                                                            count_id: number;
                                                        }>(
                                                            ENDPOINTS.SALES_FLOOR.CYCLE_COUNT
                                                                .start,
                                                            {
                                                                method: "POST",
                                                                body: JSON.stringify({
                                                                    category_id:
                                                                        entry.category_id,
                                                                }),
                                                            },
                                                            logout
                                                        );
                                                        if (res?.count_id) {
                                                            router.push({
                                                                pathname:
                                                                    "/(app)/(tabs)/home/actions/back_room/CycleCountDetail",
                                                                params: { id: res.count_id },
                                                            });
                                                        }
                                                    },
                                                },
                                            ]
                                        );
                                    }
                                }}
                            >
                                <View style={styles.entryMain}>
                                    <View style={styles.entryIconWrapper}>
                                        <Ionicons
                                            name="layers-outline"
                                            size={20}
                                            color={COLORS.primary}
                                        />
                                    </View>
                                    <View style={styles.entryDetails}>
                                        <Text style={styles.entryCategoryName}>
                                            {entry.category_name}
                                        </Text>
                                        <Text style={styles.entrySubtitle}>
                                            {hasStarted
                                                ? `Count #${entry.cycle_count_id} • ${entry.count_status || "Active"}`
                                                : "Scheduled for this week"}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.entryRight}>
                                    {hasStarted ? (
                                        <View style={styles.statusChipStarted}>
                                            <Text style={styles.statusChipStartedText}>
                                                {entry.count_status || "In Progress"}
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={styles.statusChipReady}>
                                            <Ionicons name="play" size={12} color={COLORS.primary} />
                                            <Text style={styles.statusChipReadyText}>Start</Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    };

    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={<Text style={globalStyles.headerTitle}>Weekly Schedule</Text>}
                headerRight={
                    isManagerOrAdmin ? (
                        <TouchableOpacity
                            style={styles.headerAddBtn}
                            onPress={() => setModalVisible(true)}
                        >
                            <Ionicons name="add-circle" size={26} color={COLORS.primary} />
                        </TouchableOpacity>
                    ) : null
                }
            />

            <View style={styles.container}>
                {isLoading ? (
                    <View style={globalStyles.centerElement}>
                        <LoadingSpinner />
                    </View>
                ) : error ? (
                    <View style={globalStyles.centerElement}>
                        <Text style={globalStyles.errorText}>{error}</Text>
                    </View>
                ) : sortedWeeks.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="calendar-outline" size={56} color={COLORS.inactiveTint} />
                        <Text style={styles.emptyTitle}>No scheduled weekly counts</Text>
                        <Text style={styles.emptySub}>
                            Counts are scheduled on a week-to-week basis. Add categories to upcoming weeks using the + button.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={sortedWeeks}
                        keyExtractor={(item) => item.weekKey}
                        renderItem={renderWeekGroup}
                        contentContainerStyle={styles.listContent}
                    />
                )}
            </View>

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={globalStyles.modalOverlay}>
                    <View style={[globalStyles.modalContentWrapper, { maxHeight: "85%" }]}>
                        <View style={globalStyles.modalCardContainer}>
                            <View style={globalStyles.modalHeader}>
                                <View>
                                    <Text style={globalStyles.modalTitle}>Schedule Weekly Count</Text>
                                    <Text style={globalStyles.modalSubtitle}>
                                        Assign a category to be counted for an entire week
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.modalFieldLabel}>Select Week:</Text>
                            <View style={styles.weekPickerContainer}>
                                {weekOptions.map((opt) => {
                                    const isSelected = selectedWeekOffset === opt.offset;
                                    return (
                                        <TouchableOpacity
                                            key={opt.offset}
                                            style={[
                                                styles.weekOptionPill,
                                                isSelected && styles.weekOptionPillSelected,
                                            ]}
                                            onPress={() => setSelectedWeekOffset(opt.offset)}
                                        >
                                            <Text
                                                style={[
                                                    styles.weekOptionTitle,
                                                    isSelected && styles.weekOptionTitleSelected,
                                                ]}
                                            >
                                                {opt.title}
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.weekOptionSubtitle,
                                                    isSelected && styles.weekOptionSubtitleSelected,
                                                ]}
                                            >
                                                {opt.subtitle}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={[styles.modalFieldLabel, { marginTop: SPACING.md }]}>
                                Select Category:
                            </Text>
                            <ScrollView style={styles.modalScroll}>
                                {categories.map((cat) => {
                                    const isSelected = selectedCatId === cat.category_id;
                                    return (
                                        <TouchableOpacity
                                            key={cat.category_id}
                                            style={[
                                                styles.catRow,
                                                isSelected && styles.catRowSelected,
                                            ]}
                                            onPress={() => setSelectedCatId(cat.category_id)}
                                        >
                                            <Ionicons
                                                name={isSelected ? "radio-button-on" : "radio-button-off"}
                                                size={20}
                                                color={isSelected ? COLORS.primary : COLORS.inactiveTint}
                                            />
                                            <Text
                                                style={[
                                                    styles.catRowText,
                                                    isSelected && styles.catRowTextSelected,
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
                                    styles.modalSubmitBtn,
                                    (!selectedCatId || isSaving) && { opacity: 0.6 },
                                ]}
                                disabled={!selectedCatId || isSaving}
                                onPress={handleCreateSchedule}
                            >
                                {isSaving ? (
                                    <ActivityIndicator size="small" color={COLORS.surface} />
                                ) : (
                                    <Text style={globalStyles.buttonTextPrimary}>Schedule Count</Text>
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
    headerAddBtn: {
        padding: SPACING.xs,
    },
    listContent: {
        padding: SPACING.lg,
        paddingBottom: SPACING.huge,
    },
    weekGroupCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lgPlus,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    weekHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        marginBottom: SPACING.smd,
    },
    weekTitleCol: {
        flex: 1,
    },
    weekIconRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xsm,
    },
    weekTitleText: {
        fontSize: FONT_SIZE.lg,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    currentWeekBadge: {
        backgroundColor: COLORS.activeBg,
        borderColor: COLORS.successBorder,
        borderWidth: 1,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.micro,
        borderRadius: RADIUS.sm,
    },
    currentWeekBadgeText: {
        fontSize: FONT_SIZE.xxs,
        fontWeight: "800",
        color: COLORS.success,
    },
    entriesContainer: {
        gap: SPACING.sm,
    },
    entryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: COLORS.surfaceCool,
        paddingVertical: SPACING.smd,
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.mdl,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    entryMain: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    entryIconWrapper: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.violetBg,
        justifyContent: "center",
        alignItems: "center",
        marginRight: SPACING.smd,
    },
    entryDetails: {
        flex: 1,
    },
    entryCategoryName: {
        fontSize: FONT_SIZE.md,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginBottom: SPACING.xxs,
    },
    entrySubtitle: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
    },
    entryRight: {
        marginLeft: SPACING.smd,
    },
    statusChipStarted: {
        backgroundColor: COLORS.infoBg,
        borderColor: COLORS.infoBorder,
        borderWidth: 1,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.micro,
        borderRadius: RADIUS.md,
    },
    statusChipStartedText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: "700",
        color: COLORS.info,
        textTransform: "uppercase",
    },
    statusChipReady: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xs,
        backgroundColor: COLORS.violetBg,
        paddingHorizontal: SPACING.smd,
        paddingVertical: SPACING.xsPlus,
        borderRadius: RADIUS.md,
    },
    statusChipReadyText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: "700",
        color: COLORS.primary,
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 80,
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
    modalFieldLabel: {
        fontSize: FONT_SIZE.smd,
        fontWeight: "600",
        color: COLORS.textSecondary,
        marginBottom: SPACING.xsm,
    },
    weekPickerContainer: {
        gap: SPACING.xsm,
        marginBottom: SPACING.xsm,
    },
    weekOptionPill: {
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surfaceCool,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    weekOptionPillSelected: {
        backgroundColor: COLORS.violetBg,
        borderColor: COLORS.primary,
    },
    weekOptionTitle: {
        fontSize: FONT_SIZE.smd,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    weekOptionTitleSelected: {
        color: COLORS.primary,
        fontWeight: "700",
    },
    weekOptionSubtitle: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
    },
    weekOptionSubtitleSelected: {
        color: COLORS.primary,
        fontWeight: "600",
    },
    modalScroll: {
        maxHeight: 180,
        marginBottom: SPACING.md,
    },
    catRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: SPACING.smd,
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: SPACING.xsm,
        gap: SPACING.smd,
    },
    catRowSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.violetBg,
    },
    catRowText: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textPrimary,
    },
    catRowTextSelected: {
        color: COLORS.primary,
        fontWeight: "700",
    },
    modalSubmitBtn: {
        marginTop: SPACING.sm,
    },
});

