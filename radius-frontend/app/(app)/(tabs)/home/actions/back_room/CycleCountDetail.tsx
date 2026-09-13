import React, { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    ScrollView,
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import HeaderComponent from "@/components/common/HeaderComponent";
import BackButton from "@/components/common/BackButton";
import { ENDPOINTS } from "@/constants/routes";
import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";
import { useAuth } from "@/hooks/useAuth";
import { callApi, showToast } from "@/utils/helpers";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import {
    CycleCount,
    CycleCountItemDetail,
    CycleCountDetailResponse,
    CycleCountStatus,
} from "@/types/cyclecount.types";
import { Employee, GetAllEmployeeResponse } from "@/types/admin.types";
import { getCycleCountStatusStyle } from "./CycleCount";
import { Ionicons } from "@expo/vector-icons";

type FilterTab = "FULL" | "PARTIAL" | "NO_COUNT";

export default function CycleCountDetail() {
    const { logout, user } = useAuth();
    const params = useLocalSearchParams();
    const countId = Number(params.id);

    const [detail, setDetail] = useState<CycleCountDetailResponse | null>(null);
    const [activeTab, setActiveTab] = useState<FilterTab>("FULL");
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [editingItem, setEditingItem] = useState<CycleCountItemDetail | null>(null);
    const [editQty, setEditQty] = useState<number>(0);
    const [editReason, setEditReason] = useState<string>("");

    const [submitModalVisible, setSubmitModalVisible] = useState(false);
    const [submitNotes, setSubmitNotes] = useState("");

    const [reassignModalVisible, setReassignModalVisible] = useState(false);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
    const [isTransferring, setIsTransferring] = useState(false);

    const isManagerOrAdmin =
        user?.role === "MANAGER" || user?.role === "ADMIN";

    const fetchDetail = useCallback(async () => {
        if (!countId) return;
        try {
            setError(null);
            const data = await callApi<CycleCountDetailResponse>(
                ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.getDetail(countId),
                { method: "GET" },
                logout
            );
            if (data) {
                setDetail(data);
            } else {
                if (params.from === "dashboard") {
                    router.replace("/(app)/(tabs)/home/dashboard" as any);
                } else {
                    router.replace("/(app)/(tabs)/home/actions/back_room/CycleCount" as any);
                }
            }
        } catch (err: any) {
            setError(err.message || "Failed to load cycle count details");
            if (params.from === "dashboard") {
                router.replace("/(app)/(tabs)/home/dashboard" as any);
            } else {
                router.replace("/(app)/(tabs)/home/actions/back_room/CycleCount" as any);
            }
        } finally {
            setIsLoading(false);
        }
    }, [countId, logout, params.from]);

    useFocusEffect(
        useCallback(() => {
            fetchDetail();
        }, [fetchDetail])
    );

    const openReassignModal = async () => {
        setReassignModalVisible(true);
        setSelectedEmployeeId(detail?.count.counted_by || null);
        setIsLoadingEmployees(true);
        const storeParam = detail?.count.store_id ? `&store_id=${detail.count.store_id}` : "";
        const data = await callApi<GetAllEmployeeResponse>(
            `${ENDPOINTS.MANAGER.EMPLOYEES.getAll}?page_size=100&page_number=1${storeParam}`,
            { method: "GET" },
            logout
        );
        if (data && data.employees) {
            setEmployees(data.employees.filter((e) => !e.is_terminated));
        }
        setIsLoadingEmployees(false);
    };

    const handleTransferOwnership = async () => {
        if (!selectedEmployeeId) {
            Alert.alert("Validation", "Please select an employee to transfer this count to.");
            return;
        }
        setIsTransferring(true);
        try {
            const res = await callApi(
                ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.transfer(countId),
                {
                    method: "POST",
                    body: JSON.stringify({ count_id: countId, employee_id: selectedEmployeeId }),
                },
                logout
            );
            if (res !== null) {
                showToast("success", "Cycle count transferred successfully");
                setReassignModalVisible(false);
                fetchDetail();
            }
        } finally {
            setIsTransferring(false);
        }
    };

    const getFilteredItems = () => {
        if (!detail?.items) return [];
        switch (activeTab) {
            case "FULL":
                return detail.items.filter((i) => i.counted_qty > 0);
            case "PARTIAL":
                return detail.items.filter(
                    (i) => i.counted_qty > 0 && i.counted_qty < i.expected_qty
                );
            case "NO_COUNT":
                return detail.items.filter((i) => i.counted_qty === 0);
            default:
                return detail.items;
        }
    };

    const fullCountCount = detail?.items.filter((i) => i.counted_qty > 0).length || 0;
    const partialCountCount =
        detail?.items.filter((i) => i.counted_qty > 0 && i.counted_qty < i.expected_qty).length || 0;
    const noCountCount = detail?.items.filter((i) => i.counted_qty === 0).length || 0;

    const handleSaveItemQty = async () => {
        if (!editingItem) return;
        setIsActionLoading(true);
        try {
            await callApi(
                ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.scan(countId),
                {
                    method: "POST",
                    body: JSON.stringify({
                        count_id: countId,
                        product_id: editingItem.product_id,
                        counted_qty: editQty,
                        reason_code: editReason.trim() || undefined,
                    }),
                },
                logout
            );
            setEditingItem(null);
            fetchDetail();
        } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to update item quantity");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleSubmitForApproval = async () => {
        setIsActionLoading(true);
        try {
            await callApi(
                ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.submit(countId),
                {
                    method: "POST",
                    body: JSON.stringify({
                        count_id: countId,
                        notes: submitNotes.trim() || undefined,
                    }),
                },
                logout
            );
            setSubmitModalVisible(false);
            fetchDetail();
            Alert.alert("Submitted", "Cycle count submitted for manager approval.");
        } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to submit count");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleApproveCount = () => {
        Alert.alert(
            "Approve Cycle Count",
            "Are you sure you want to approve this count? Store inventory will be updated and variance logged to the audit trail.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Approve & Reconcile",
                    style: "default",
                    onPress: async () => {
                        setIsActionLoading(true);
                        try {
                            await callApi(
                                ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.approve(countId),
                                {
                                    method: "POST",
                                    body: JSON.stringify({ count_id: countId }),
                                },
                                logout
                            );
                            fetchDetail();
                            Alert.alert("Approved", "Cycle count approved and inventory updated!");
                        } catch (err: any) {
                            Alert.alert("Error", err.message || "Failed to approve count");
                        } finally {
                            setIsActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const renderItem = ({ item }: { item: CycleCountItemDetail }) => {
        const isMatched = item.counted_qty === item.expected_qty && item.counted_qty > 0;
        const isDiscrepancy = item.counted_qty > 0 && item.variance !== 0;

        let badgeBorder = "#E0E0E0";
        let badgeBg = "#F5F5F5";
        let badgeText = COLORS.textSecondary;

        if (isMatched) {
            badgeBorder = "#A5D6A7";
            badgeBg = "#E8F5E9";
            badgeText = COLORS.success;
        } else if (isDiscrepancy) {
            badgeBorder = item.variance < 0 ? "#EF9A9A" : "#80CBC4";
            badgeBg = item.variance < 0 ? "#FFEBEE" : "#E0F2F1";
            badgeText = item.variance < 0 ? COLORS.error : "#00695C";
        }

        const canEdit =
            detail?.count.status === "IN PROGRESS" || detail?.count.status === "NOT STARTED";

        return (
            <TouchableOpacity
                style={styles.itemRow}
                activeOpacity={canEdit ? 0.7 : 1}
                onPress={() => {
                    if (canEdit) {
                        setEditingItem(item);
                        setEditQty(item.counted_qty);
                        setEditReason(item.reason_code || "");
                    }
                }}
            >
                <View style={styles.productIconWrapper}>
                    <Ionicons name="cube-outline" size={22} color={COLORS.textSecondary} />
                </View>

                <View style={styles.itemDetails}>
                    <Text style={styles.itemTitle} numberOfLines={2}>
                        {item.product_name}
                    </Text>
                    <Text style={styles.itemSub}>
                        SKU: {item.sku}  UPC: {item.upc}
                    </Text>
                    {item.reason_code && (
                        <Text style={styles.reasonText}>Reason: {item.reason_code}</Text>
                    )}
                </View>

                <View style={styles.metricsCol}>
                    <View style={styles.metricPairRow}>
                        <View style={styles.metricBox}>
                            <Text style={styles.metricLabel}>Expected</Text>
                            <Text style={styles.metricValExpected}>{item.expected_qty}</Text>
                        </View>
                        <View style={styles.metricDivider} />
                        <View style={styles.metricBox}>
                            <Text style={styles.metricLabel}>Scanned</Text>
                            <Text style={[styles.metricValScanned, { color: badgeText }]}>
                                {item.counted_qty}
                            </Text>
                        </View>
                    </View>

                    {item.counted_qty > 0 ? (
                        <View
                            style={[
                                styles.diffPill,
                                { backgroundColor: badgeBg, borderColor: badgeBorder },
                            ]}
                        >
                            <Text style={[styles.diffPillText, { color: badgeText }]}>
                                {isMatched
                                    ? "Matched"
                                    : item.variance > 0
                                    ? `+${item.variance} over`
                                    : `${item.variance} short`}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.uncountedPill}>
                            <Text style={styles.uncountedPillText}>Not Counted</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    if (isLoading) {
        return (
            <TopSafeAreaView>
                <HeaderComponent
                    headerLeft={<BackButton />}
                    headerCenter={<Text style={globalStyles.headerTitle}>Cycle Count</Text>}
                />
                <View style={globalStyles.centerElement}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </TopSafeAreaView>
        );
    }

    if (error || !detail) {
        return (
            <TopSafeAreaView>
                <HeaderComponent
                    headerLeft={<BackButton />}
                    headerCenter={<Text style={globalStyles.headerTitle}>Cycle Count</Text>}
                />
                <View style={globalStyles.centerElement}>
                    <Text style={globalStyles.errorText}>{error || "Not found"}</Text>
                </View>
            </TopSafeAreaView>
        );
    }

    const { count } = detail;
    const filteredItems = getFilteredItems();
    const statusStyle = getCycleCountStatusStyle(count.status);

    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={<Text style={globalStyles.headerTitle}>Cycle Count</Text>}
                headerRight={
                    <TouchableOpacity onPress={fetchDetail} style={{ padding: 4 }}>
                        <Ionicons name="refresh-outline" size={22} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                }
            />

            <View style={styles.container}>
                <View style={styles.summaryCard}>
                    <View style={styles.summaryTopRow}>
                        <Text style={styles.batchTitle}>Count #{count.count_id}</Text>
                        <View style={styles.totalBadge}>
                            <Text style={styles.totalBadgeText}>
                                {count.counted_items} / {count.total_items} Items
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.categorySub}>
                        Category: <Text style={{ fontWeight: "700", color: COLORS.textPrimary }}>{count.category_name}</Text>
                    </Text>

                    <View style={styles.assigneeRow}>
                        <View style={styles.assigneeInfo}>
                            <Ionicons name="person-outline" size={16} color={COLORS.textSecondary} />
                            <Text style={styles.assigneeText}>
                                Assigned to:{" "}
                                <Text style={{ fontWeight: "700", color: COLORS.textPrimary }}>
                                    {count.counted_by_name || "Unassigned"}
                                </Text>
                            </Text>
                        </View>

                        {isManagerOrAdmin && (
                            <TouchableOpacity
                                style={styles.reassignBtn}
                                activeOpacity={0.7}
                                onPress={openReassignModal}
                            >
                                <Ionicons name="swap-horizontal" size={14} color={COLORS.primary} />
                                <Text style={styles.reassignBtnText}>Reassign</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.statusRow}>
                        <View
                            style={[
                                styles.statusPill,
                                {
                                    backgroundColor: statusStyle.bg,
                                    borderColor: statusStyle.border,
                                },
                            ]}
                        >
                            <Text style={[styles.statusPillText, { color: statusStyle.text }]}>
                                {count.status}
                            </Text>
                        </View>

                        <View style={styles.dateCol}>
                            <Text style={styles.dateSub}>
                                {count.count_date
                                    ? new Date(count.count_date).toLocaleDateString(undefined, {
                                          month: "short",
                                          day: "numeric",
                                      })
                                    : "Pending"}
                            </Text>
                        </View>
                    </View>

                    {count.total_variance_cost !== 0 && (
                        <View style={styles.varianceRow}>
                            <Text style={styles.varianceLabel}>Total Discrepancy Cost:</Text>
                            <Text
                                style={[
                                    styles.varianceAmount,
                                    count.total_variance_cost < 0
                                        ? styles.varNegative
                                        : styles.varPositive,
                                ]}
                            >
                                {count.total_variance_cost < 0 ? "-" : "+"}$
                                {Math.abs(count.total_variance_cost).toFixed(2)}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === "FULL" && styles.tabButtonActive]}
                        onPress={() => setActiveTab("FULL")}
                    >
                        <Text
                            style={[
                                styles.tabButtonText,
                                activeTab === "FULL" && styles.tabButtonTextActive,
                            ]}
                        >
                            Counted ({fullCountCount})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === "PARTIAL" && styles.tabButtonActive]}
                        onPress={() => setActiveTab("PARTIAL")}
                    >
                        <Text
                            style={[
                                styles.tabButtonText,
                                activeTab === "PARTIAL" && styles.tabButtonTextActive,
                            ]}
                        >
                            Partial ({partialCountCount})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === "NO_COUNT" && styles.tabButtonActive]}
                        onPress={() => setActiveTab("NO_COUNT")}
                    >
                        <Text
                            style={[
                                styles.tabButtonText,
                                activeTab === "NO_COUNT" && styles.tabButtonTextActive,
                            ]}
                        >
                            Uncounted ({noCountCount})
                        </Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={filteredItems}
                    keyExtractor={(item) => item.count_item_id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyItems}>
                            <Text style={styles.emptyItemsText}>No items in this tab</Text>
                        </View>
                    }
                />

                <View style={styles.bottomBar}>
                    {count.status === "IN PROGRESS" || count.status === "NOT STARTED" ? (
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={[globalStyles.buttonPrimary, styles.countButton]}
                                activeOpacity={0.85}
                                onPress={() =>
                                    router.push({
                                        pathname:
                                            "/(app)/(tabs)/home/actions/back_room/CycleCountScanner",
                                        params: { id: count.count_id },
                                    })
                                }
                            >
                                <Ionicons name="barcode-outline" size={20} color="#FFF" />
                                <Text style={globalStyles.buttonTextPrimary}>Count / Scan</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.submitButton, isActionLoading && { opacity: 0.6 }]}
                                activeOpacity={0.85}
                                disabled={isActionLoading}
                                onPress={() => setSubmitModalVisible(true)}
                            >
                                <Text style={styles.submitButtonText}>Send for Approval</Text>
                            </TouchableOpacity>
                        </View>
                    ) : count.status === "PENDING APPROVAL" ? (
                        isManagerOrAdmin ? (
                            <TouchableOpacity
                                style={[styles.approveButton, isActionLoading && { opacity: 0.6 }]}
                                activeOpacity={0.85}
                                disabled={isActionLoading}
                                onPress={handleApproveCount}
                            >
                                {isActionLoading ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                                        <Text style={styles.approveButtonText}>
                                            Approve & Reconcile Inventory
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.pendingInfoBanner}>
                                <Ionicons name="time-outline" size={20} color="#F57F17" />
                                <Text style={styles.pendingInfoText}>
                                    Submitted for manager review & approval
                                </Text>
                            </View>
                        )
                    ) : count.status === "APPROVED" ? (
                        <View style={styles.approvedBanner}>
                            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                            <Text style={styles.approvedBannerText}>
                                Approved by {count.approved_by_name || "Manager"} • Inventory Updated
                            </Text>
                        </View>
                    ) : null}
                </View>
            </View>

            <Modal
                visible={!!editingItem}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setEditingItem(null)}
            >
                <View style={globalStyles.modalOverlay}>
                    <View style={globalStyles.modalContentWrapper}>
                        <View style={globalStyles.modalCardContainer}>
                            <View style={globalStyles.modalHeader}>
                                <View style={{ flex: 1, marginRight: 12 }}>
                                    <Text style={globalStyles.modalTitle} numberOfLines={2}>
                                        {editingItem?.product_name}
                                    </Text>
                                    <Text style={globalStyles.modalSubtitle}>
                                        Expected in Store: {editingItem?.expected_qty} units
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setEditingItem(null)}>
                                    <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.stepperContainer}>
                                <TouchableOpacity
                                    style={styles.stepperButton}
                                    onPress={() => setEditQty((prev) => Math.max(0, prev - 1))}
                                >
                                    <Ionicons name="remove" size={24} color={COLORS.textPrimary} />
                                </TouchableOpacity>
                                <View style={styles.stepperValueBox}>
                                    <Text style={styles.stepperValueText}>{editQty}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.stepperButton}
                                    onPress={() => setEditQty((prev) => prev + 1)}
                                >
                                    <Ionicons name="add" size={24} color={COLORS.textPrimary} />
                                </TouchableOpacity>
                            </View>

                            {editQty !== editingItem?.expected_qty && (
                                <View style={styles.reasonInputContainer}>
                                    <Text style={styles.reasonLabel}>Discrepancy Reason (Optional):</Text>
                                    <TextInput
                                        style={globalStyles.textInput}
                                        placeholder="e.g. Damaged stock, Misplaced, Overstock"
                                        placeholderTextColor={COLORS.placeholder}
                                        value={editReason}
                                        onChangeText={setEditReason}
                                    />
                                </View>
                            )}

                            <TouchableOpacity
                                style={[
                                    globalStyles.buttonPrimary,
                                    styles.modalSaveButton,
                                    isActionLoading && { opacity: 0.6 },
                                ]}
                                disabled={isActionLoading}
                                onPress={handleSaveItemQty}
                            >
                                {isActionLoading ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={globalStyles.buttonTextPrimary}>Save Count</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={submitModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setSubmitModalVisible(false)}
            >
                <View style={globalStyles.modalOverlay}>
                    <View style={globalStyles.modalContentWrapper}>
                        <View style={globalStyles.modalCardContainer}>
                            <View style={globalStyles.modalHeader}>
                                <View>
                                    <Text style={globalStyles.modalTitle}>Submit for Approval</Text>
                                    <Text style={globalStyles.modalSubtitle}>
                                        Send count to store manager for review
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setSubmitModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.reasonInputContainer}>
                                <Text style={styles.reasonLabel}>Notes for Manager (Optional):</Text>
                                <TextInput
                                    style={[globalStyles.textInput, { height: 80, textAlignVertical: "top" }]}
                                    placeholder="e.g. All sections scanned, variance noted on cables"
                                    placeholderTextColor={COLORS.placeholder}
                                    multiline
                                    value={submitNotes}
                                    onChangeText={setSubmitNotes}
                                />
                            </View>

                            <TouchableOpacity
                                style={[
                                    globalStyles.buttonPrimary,
                                    styles.modalSaveButton,
                                    isActionLoading && { opacity: 0.6 },
                                ]}
                                disabled={isActionLoading}
                                onPress={handleSubmitForApproval}
                            >
                                {isActionLoading ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={globalStyles.buttonTextPrimary}>Submit Count</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={reassignModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setReassignModalVisible(false)}
            >
                <View style={globalStyles.modalOverlay}>
                    <View style={[globalStyles.modalContentWrapper, { maxHeight: "80%" }]}>
                        <View style={globalStyles.modalCardContainer}>
                            <View style={globalStyles.modalHeader}>
                                <View>
                                    <Text style={globalStyles.modalTitle}>Transfer Ownership</Text>
                                    <Text style={globalStyles.modalSubtitle}>
                                        Assign this cycle count to a store employee
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setReassignModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {isLoadingEmployees ? (
                                <View style={{ paddingVertical: 30, alignItems: "center" }}>
                                    <ActivityIndicator size="small" color={COLORS.primary} />
                                </View>
                            ) : (
                                <ScrollView style={{ maxHeight: 280, marginVertical: 10 }}>
                                    {employees.map((emp) => {
                                        const isSelected = selectedEmployeeId === emp.employee_id;
                                        return (
                                            <TouchableOpacity
                                                key={emp.employee_id}
                                                style={[
                                                    styles.empSelectItem,
                                                    isSelected && styles.empSelectItemActive,
                                                ]}
                                                onPress={() => setSelectedEmployeeId(emp.employee_id)}
                                            >
                                                <Ionicons
                                                    name={isSelected ? "radio-button-on" : "radio-button-off"}
                                                    size={20}
                                                    color={isSelected ? COLORS.primary : COLORS.textSecondary}
                                                />
                                                <View style={{ marginLeft: 12, flex: 1 }}>
                                                    <Text
                                                        style={[
                                                            styles.empSelectName,
                                                            isSelected && styles.empSelectNameActive,
                                                        ]}
                                                    >
                                                        {emp.first_name} {emp.last_name}
                                                    </Text>
                                                    <Text style={styles.empSelectRole}>
                                                        {emp.role} • {emp.email}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            )}

                            <TouchableOpacity
                                style={[
                                    globalStyles.buttonPrimary,
                                    styles.modalSaveButton,
                                    isTransferring && { opacity: 0.6 },
                                ]}
                                disabled={isTransferring}
                                onPress={handleTransferOwnership}
                            >
                                {isTransferring ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={globalStyles.buttonTextPrimary}>Confirm Transfer</Text>
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
    summaryCard: {
        backgroundColor: COLORS.surface,
        margin: 16,
        marginBottom: 8,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    summaryTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    batchTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.textPrimary,
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
        fontSize: 13,
        fontWeight: "700",
        color: "#E65100",
    },
    categorySub: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 6,
    },
    assigneeRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 8,
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: "#F9FAFB",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    assigneeInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        flex: 1,
    },
    assigneeText: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    reassignBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        backgroundColor: "#EDE7F6",
    },
    reassignBtnText: {
        fontSize: 12,
        fontWeight: "700",
        color: COLORS.primary,
    },
    statusRow: {
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
    },
    statusPillText: {
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
    },
    dateCol: {
        flexDirection: "row",
        alignItems: "center",
    },
    dateSub: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    varianceRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    varianceLabel: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    varianceAmount: {
        fontSize: 14,
        fontWeight: "700",
    },
    varNegative: {
        color: COLORS.error,
    },
    varPositive: {
        color: COLORS.success,
    },
    tabBar: {
        flexDirection: "row",
        backgroundColor: COLORS.surface,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        gap: 8,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "#F0F0F0",
        alignItems: "center",
        justifyContent: "center",
    },
    tabButtonActive: {
        backgroundColor: "#212121",
    },
    tabButtonText: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    tabButtonTextActive: {
        color: "#FFFFFF",
    },
    listContent: {
        paddingVertical: 8,
        paddingBottom: 90,
    },
    itemRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.surface,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    productIconWrapper: {
        width: 38,
        height: 38,
        borderRadius: 8,
        backgroundColor: "#F5F5F5",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    itemDetails: {
        flex: 1,
        marginRight: 10,
    },
    itemTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    itemSub: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    reasonText: {
        fontSize: 11,
        color: COLORS.error,
        fontStyle: "italic",
        marginTop: 2,
    },
    metricsCol: {
        alignItems: "flex-end",
    },
    metricPairRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 8,
    },
    metricBox: {
        alignItems: "center",
    },
    metricLabel: {
        fontSize: 9,
        fontWeight: "600",
        textTransform: "uppercase",
        color: COLORS.textSecondary,
    },
    metricValExpected: {
        fontSize: 14,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    metricValScanned: {
        fontSize: 14,
        fontWeight: "800",
    },
    metricDivider: {
        width: 1,
        height: 20,
        backgroundColor: COLORS.border,
    },
    diffPill: {
        marginTop: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
    },
    diffPillText: {
        fontSize: 10,
        fontWeight: "700",
    },
    uncountedPill: {
        marginTop: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: "#F5F5F5",
        borderWidth: 1,
        borderColor: "#E0E0E0",
    },
    uncountedPillText: {
        fontSize: 10,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    emptyItems: {
        paddingVertical: 40,
        alignItems: "center",
    },
    emptyItemsText: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    bottomBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.surface,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    actionRow: {
        flexDirection: "row",
        gap: 10,
    },
    countButton: {
        flex: 1,
        flexDirection: "row",
        gap: 8,
        justifyContent: "center",
    },
    submitButton: {
        flex: 1,
        backgroundColor: "#424242",
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    submitButtonText: {
        color: "#FFFFFF",
        fontWeight: "700",
        fontSize: 15,
    },
    approveButton: {
        backgroundColor: COLORS.success,
        borderRadius: 8,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    approveButtonText: {
        color: "#FFFFFF",
        fontWeight: "700",
        fontSize: 15,
    },
    pendingInfoBanner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFF8E1",
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    pendingInfoText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#F57F17",
    },
    approvedBanner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#E8F5E9",
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    approvedBannerText: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.success,
    },
    stepperContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginVertical: 18,
        gap: 20,
    },
    stepperButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#E0E0E0",
        justifyContent: "center",
        alignItems: "center",
    },
    stepperValueBox: {
        minWidth: 60,
        alignItems: "center",
    },
    stepperValueText: {
        fontSize: 28,
        fontWeight: "800",
        color: COLORS.textPrimary,
    },
    reasonInputContainer: {
        marginTop: 10,
        marginBottom: 14,
    },
    reasonLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textSecondary,
        marginBottom: 6,
    },
    modalSaveButton: {
        marginTop: 8,
    },
    empSelectItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginBottom: 6,
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    empSelectItemActive: {
        backgroundColor: "#EDE7F6",
        borderColor: COLORS.primary,
    },
    empSelectName: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    empSelectNameActive: {
        color: COLORS.primary,
        fontWeight: "700",
    },
    empSelectRole: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
});
