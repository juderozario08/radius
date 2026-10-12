import React, { useState, useCallback } from "react";
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
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import HeaderComponent from "@/components/common/HeaderComponent";
import BackButton from "@/components/common/BackButton";
import { ENDPOINTS } from "@/constants/routes";
import { COLORS } from "@/constants/colors";
import { globalStyles, SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";
import { useAuth } from "@/hooks/useAuth";
import { callApi, showToast } from "@/utils/helpers";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import {
    CycleCountItemDetail,
    CycleCountDetailResponse,
} from "@/types/cyclecount.types";
import { Employee, GetAllEmployeeResponse } from "@/types/admin.types";
import { getCycleCountStatusStyle } from "./CycleCount";
import { Ionicons } from "@expo/vector-icons";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { formatSignedMoney } from "@/utils/money";

type FilterTab = "FULL" | "PARTIAL" | "NO_COUNT";

export default function CycleCountDetail() {
    const { logout, user } = useAuth();
    const params = useLocalSearchParams();
    const countId = Number(params.id);

    const [detail, setDetail] = useState<CycleCountDetailResponse | null>(null);
    const [activeTab, setActiveTab] = useState<FilterTab>("FULL");
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);

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
        const data = await callApi<CycleCountDetailResponse>(
            ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.getDetail(countId),
            { method: "GET" },
            logout
        );
        if (data) {
            setDetail(data);
        }
        setIsLoading(false);
    }, [countId, logout]);

    const retryInitialLoad = () => {
        setIsLoading(true);
        fetchDetail();
    };

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
        const endpoint = user?.role === "ADMIN"
            ? `${ENDPOINTS.ADMIN.EMPLOYEES.getAll}?page_size=100&page_number=1${storeParam}`
            : `${ENDPOINTS.MANAGER.EMPLOYEES.getAll}?page_size=100&page_number=1${storeParam}`;
        const data = await callApi<GetAllEmployeeResponse>(
            endpoint,
            { method: "GET" },
            logout
        );
        if (data && data.employees) {
            setEmployees(data.employees.filter((e) => !e.is_terminated && e.role !== "ADMIN"));
        }
        setIsLoadingEmployees(false);
    };

    const handleTransferOwnership = async () => {
        if (!selectedEmployeeId) {
            Alert.alert("Validation", "Please select an employee to transfer this count to.");
            return;
        }
        setIsTransferring(true);
        const res = await callApi(
            ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.transfer(countId),
            {
                method: "POST",
                body: JSON.stringify({ employee_id: selectedEmployeeId }),
            },
            logout
        );
        setIsTransferring(false);
        if (res !== null) {
            showToast("success", "Cycle count transferred successfully");
            setReassignModalVisible(false);
            fetchDetail();
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
        const res = await callApi(
            ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.scan(countId),
            {
                method: "POST",
                body: JSON.stringify({
                    product_id: editingItem.product_id,
                    counted_qty: editQty,
                    reason_code: editReason.trim() || undefined,
                }),
            },
            logout
        );
        setIsActionLoading(false);
        if (res === null) return;
        setEditingItem(null);
        fetchDetail();
    };

    const handleSubmitForApproval = async () => {
        setIsActionLoading(true);
        const res = await callApi(
            ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.submit(countId),
            {
                method: "POST",
                body: JSON.stringify({
                    notes: submitNotes.trim() || undefined,
                }),
            },
            logout
        );
        setIsActionLoading(false);
        if (res === null) return;
        setSubmitModalVisible(false);
        fetchDetail();
        Alert.alert("Submitted", "Cycle count submitted for manager approval.");
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
                        const res = await callApi(
                            ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.approve(countId),
                            { method: "POST" },
                            logout
                        );
                        setIsActionLoading(false);
                        if (res === null) return;
                        fetchDetail();
                        Alert.alert("Approved", "Cycle count approved and inventory updated!");
                    },
                },
            ]
        );
    };

    const renderItem = ({ item }: { item: CycleCountItemDetail }) => {
        const isMatched = item.counted_qty === item.expected_qty && item.counted_qty > 0;
        const isDiscrepancy = item.counted_qty > 0 && item.variance !== 0;

        let badgeBorder = COLORS.inputBorder;
        let badgeBg = COLORS.background;
        let badgeText = COLORS.textSecondary;

        if (isMatched) {
            badgeBorder = COLORS.successBorder;
            badgeBg = COLORS.activeBg;
            badgeText = COLORS.success;
        } else if (isDiscrepancy) {
            badgeBorder = item.variance < 0 ? COLORS.dangerBorder : COLORS.tealBorder;
            badgeBg = item.variance < 0 ? COLORS.inactiveBg : COLORS.tealBg;
            badgeText = item.variance < 0 ? COLORS.error : COLORS.tealDark;
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
                    <LoadingSpinner />
                </View>
            </TopSafeAreaView>
        );
    }

    if (!detail) {
        return (
            <TopSafeAreaView>
                <HeaderComponent
                    headerLeft={<BackButton />}
                    headerCenter={<Text style={globalStyles.headerTitle}>Cycle Count</Text>}
                />
                <View style={globalStyles.centerElement}>
                    <ErrorMessage message="Couldn't load this cycle count." onRetry={retryInitialLoad} />
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
                    <TouchableOpacity onPress={fetchDetail} style={{ padding: SPACING.xs }}>
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
                                <Text style={styles.reassignBtnText}>
                                    {count.counted_by ? "Reassign" : "Assign"}
                                </Text>
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
                                {formatSignedMoney(count.total_variance_cost)}
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
                                <Ionicons name="barcode-outline" size={20} color={COLORS.surface} />
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
                                    <ActivityIndicator size="small" color={COLORS.surface} />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.surface} />
                                        <Text style={styles.approveButtonText}>
                                            Approve & Reconcile Inventory
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.pendingInfoBanner}>
                                <Ionicons name="time-outline" size={20} color={COLORS.pending} />
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
                                <View style={{ flex: 1, marginRight: SPACING.md }}>
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
                                    <ActivityIndicator size="small" color={COLORS.surface} />
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
                                    <ActivityIndicator size="small" color={COLORS.surface} />
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
                                    <Text style={globalStyles.modalTitle}>
                                        {detail?.count.counted_by ? "Transfer Ownership" : "Assign Ownership"}
                                    </Text>
                                    <Text style={globalStyles.modalSubtitle}>
                                        Assign this cycle count to a store employee
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setReassignModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {isLoadingEmployees ? (
                                <View style={{ paddingVertical: SPACING.xxlPlus, alignItems: "center" }}>
                                    <ActivityIndicator size="small" color={COLORS.primary} />
                                </View>
                            ) : (
                                <FlatList
                                    style={{ maxHeight: 280, marginVertical: SPACING.smd }}
                                    data={employees}
                                    keyExtractor={(emp) => String(emp.employee_id)}
                                    extraData={selectedEmployeeId}
                                    renderItem={({ item: emp }) => {
                                        const isSelected = selectedEmployeeId === emp.employee_id;
                                        return (
                                            <TouchableOpacity
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
                                                <View style={{ marginLeft: SPACING.md, flex: 1 }}>
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
                                    }}
                                />
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
                                    <ActivityIndicator size="small" color={COLORS.surface} />
                                ) : (
                                    <Text style={globalStyles.buttonTextPrimary}>
                                        {detail?.count.counted_by ? "Confirm Transfer" : "Confirm Assignment"}
                                    </Text>
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
        margin: SPACING.lg,
        marginBottom: SPACING.sm,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    summaryTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    batchTitle: {
        fontSize: FONT_SIZE.xl,
        fontWeight: "700",
        color: COLORS.textPrimary,
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
        fontSize: FONT_SIZE.smd,
        fontWeight: "700",
        color: COLORS.warning,
    },
    categorySub: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        marginTop: SPACING.xsm,
    },
    assigneeRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: SPACING.sm,
        paddingVertical: SPACING.xsm,
        paddingHorizontal: SPACING.smd,
        backgroundColor: COLORS.surfaceCool,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    assigneeInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xsm,
        flex: 1,
    },
    assigneeText: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textSecondary,
    },
    reassignBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xs,
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.violetBg,
    },
    reassignBtnText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: "700",
        color: COLORS.primary,
    },
    statusRow: {
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
    },
    statusPillText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: "700",
        textTransform: "uppercase",
    },
    dateCol: {
        flexDirection: "row",
        alignItems: "center",
    },
    dateSub: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textSecondary,
    },
    varianceRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: SPACING.smd,
        paddingTop: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    varianceLabel: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textSecondary,
    },
    varianceAmount: {
        fontSize: FONT_SIZE.md,
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
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        gap: SPACING.sm,
    },
    tabButton: {
        flex: 1,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.xxl,
        backgroundColor: COLORS.neutralBg,
        alignItems: "center",
        justifyContent: "center",
    },
    tabButtonActive: {
        backgroundColor: COLORS.neutralDark,
    },
    tabButtonText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    tabButtonTextActive: {
        color: COLORS.surface,
    },
    listContent: {
        paddingVertical: SPACING.sm,
        paddingBottom: 90,
    },
    itemRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.surface,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    productIconWrapper: {
        width: 38,
        height: 38,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.background,
        justifyContent: "center",
        alignItems: "center",
        marginRight: SPACING.smd,
    },
    itemDetails: {
        flex: 1,
        marginRight: SPACING.smd,
    },
    itemTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: "600",
        color: COLORS.textPrimary,
        marginBottom: SPACING.xxs,
    },
    itemSub: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
    },
    reasonText: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.error,
        fontStyle: "italic",
        marginTop: SPACING.xxs,
    },
    metricsCol: {
        alignItems: "flex-end",
    },
    metricPairRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.surfaceCool,
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: SPACING.sm,
    },
    metricBox: {
        alignItems: "center",
    },
    metricLabel: {
        fontSize: FONT_SIZE.micro,
        fontWeight: "600",
        textTransform: "uppercase",
        color: COLORS.textSecondary,
    },
    metricValExpected: {
        fontSize: FONT_SIZE.md,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    metricValScanned: {
        fontSize: FONT_SIZE.md,
        fontWeight: "800",
    },
    metricDivider: {
        width: 1,
        height: 20,
        backgroundColor: COLORS.border,
    },
    diffPill: {
        marginTop: SPACING.xs,
        paddingHorizontal: SPACING.xsm,
        paddingVertical: SPACING.xxs,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
    },
    diffPillText: {
        fontSize: FONT_SIZE.xxs,
        fontWeight: "700",
    },
    uncountedPill: {
        marginTop: SPACING.xs,
        paddingHorizontal: SPACING.xsm,
        paddingVertical: SPACING.xxs,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
    },
    uncountedPillText: {
        fontSize: FONT_SIZE.xxs,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    emptyItems: {
        paddingVertical: SPACING.huge,
        alignItems: "center",
    },
    emptyItemsText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZE.md,
    },
    bottomBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.surface,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    actionRow: {
        flexDirection: "row",
        gap: SPACING.smd,
    },
    countButton: {
        flex: 1,
        flexDirection: "row",
        gap: SPACING.sm,
        justifyContent: "center",
    },
    submitButton: {
        flex: 1,
        backgroundColor: COLORS.neutralDarkMuted,
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.mdl,
        alignItems: "center",
        justifyContent: "center",
    },
    submitButtonText: {
        color: COLORS.surface,
        fontWeight: "700",
        fontSize: FONT_SIZE.mdl,
    },
    approveButton: {
        backgroundColor: COLORS.success,
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.mdl,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: SPACING.sm,
    },
    approveButtonText: {
        color: COLORS.surface,
        fontWeight: "700",
        fontSize: FONT_SIZE.mdl,
    },
    pendingInfoBanner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.pendingBg,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.md,
        gap: SPACING.sm,
    },
    pendingInfoText: {
        fontSize: FONT_SIZE.smd,
        fontWeight: "600",
        color: COLORS.pending,
    },
    approvedBanner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.activeBg,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.md,
        gap: SPACING.sm,
    },
    approvedBannerText: {
        fontSize: FONT_SIZE.smd,
        fontWeight: "600",
        color: COLORS.success,
    },
    stepperContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginVertical: SPACING.lgPlus,
        gap: SPACING.xl,
    },
    stepperButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.inputBorder,
        justifyContent: "center",
        alignItems: "center",
    },
    stepperValueBox: {
        minWidth: 60,
        alignItems: "center",
    },
    stepperValueText: {
        fontSize: FONT_SIZE.display,
        fontWeight: "800",
        color: COLORS.textPrimary,
    },
    reasonInputContainer: {
        marginTop: SPACING.smd,
        marginBottom: SPACING.mdl,
    },
    reasonLabel: {
        fontSize: FONT_SIZE.smd,
        fontWeight: "600",
        color: COLORS.textSecondary,
        marginBottom: SPACING.xsm,
    },
    modalSaveButton: {
        marginTop: SPACING.sm,
    },
    empSelectItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: SPACING.smd,
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.md,
        marginBottom: SPACING.xsm,
        backgroundColor: COLORS.surfaceCool,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    empSelectItemActive: {
        backgroundColor: COLORS.violetBg,
        borderColor: COLORS.primary,
    },
    empSelectName: {
        fontSize: FONT_SIZE.md,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    empSelectNameActive: {
        color: COLORS.primary,
        fontWeight: "700",
    },
    empSelectRole: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        marginTop: SPACING.xxs,
    },
});
