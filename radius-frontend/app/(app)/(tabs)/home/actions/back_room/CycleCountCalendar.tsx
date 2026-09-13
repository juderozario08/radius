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
    Alert,
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
import { CycleCountScheduleEntry } from "@/types/cyclecount.types";
import { Category } from "@/types/inventory.types";
import { Ionicons } from "@expo/vector-icons";

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
        try {
            setError(null);
            const data = await callApi<CycleCountScheduleEntry[]>(
                ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.schedule,
                { method: "GET" },
                logout
            );
            if (data) {
                setSchedule(data);
            }
        } catch (err: any) {
            setError(err.message || "Failed to load schedule");
        } finally {
            setIsLoading(false);
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
        try {
            await callApi(
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
            setModalVisible(false);
            setSelectedCatId(null);
            setSelectedWeekOffset(0);
            fetchSchedule();
            Alert.alert("Success", "Cycle count scheduled for the selected week!");
        } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to schedule count");
        } finally {
            setIsSaving(false);
        }
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
                                                        try {
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
                                                        } catch (e: any) {
                                                            Alert.alert("Error", e.message);
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
                        <ActivityIndicator size="large" color={COLORS.primary} />
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

                            <Text style={[styles.modalFieldLabel, { marginTop: 12 }]}>
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
                                    <ActivityIndicator size="small" color="#FFF" />
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
        padding: 4,
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    weekGroupCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    weekHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        marginBottom: 10,
    },
    weekTitleCol: {
        flex: 1,
    },
    weekIconRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    weekTitleText: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    currentWeekBadge: {
        backgroundColor: "#E8F5E9",
        borderColor: "#A5D6A7",
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    currentWeekBadgeText: {
        fontSize: 10,
        fontWeight: "800",
        color: COLORS.success,
    },
    entriesContainer: {
        gap: 8,
    },
    entryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
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
        borderRadius: 8,
        backgroundColor: "#EDE7F6",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    entryDetails: {
        flex: 1,
    },
    entryCategoryName: {
        fontSize: 14,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    entrySubtitle: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    entryRight: {
        marginLeft: 10,
    },
    statusChipStarted: {
        backgroundColor: "#E3F2FD",
        borderColor: "#90CAF9",
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    statusChipStartedText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#1565C0",
        textTransform: "uppercase",
    },
    statusChipReady: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#EDE7F6",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    statusChipReadyText: {
        fontSize: 12,
        fontWeight: "700",
        color: COLORS.primary,
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 80,
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
    modalFieldLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textSecondary,
        marginBottom: 6,
    },
    weekPickerContainer: {
        gap: 6,
        marginBottom: 6,
    },
    weekOptionPill: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: "#F9FAFB",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    weekOptionPillSelected: {
        backgroundColor: "#EDE7F6",
        borderColor: COLORS.primary,
    },
    weekOptionTitle: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    weekOptionTitleSelected: {
        color: COLORS.primary,
        fontWeight: "700",
    },
    weekOptionSubtitle: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    weekOptionSubtitleSelected: {
        color: COLORS.primary,
        fontWeight: "600",
    },
    modalScroll: {
        maxHeight: 180,
        marginBottom: 12,
    },
    catRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 6,
        gap: 10,
    },
    catRowSelected: {
        borderColor: COLORS.primary,
        backgroundColor: "#EDE7F6",
    },
    catRowText: {
        fontSize: 14,
        color: COLORS.textPrimary,
    },
    catRowTextSelected: {
        color: COLORS.primary,
        fontWeight: "700",
    },
    modalSubmitBtn: {
        marginTop: 8,
    },
});

