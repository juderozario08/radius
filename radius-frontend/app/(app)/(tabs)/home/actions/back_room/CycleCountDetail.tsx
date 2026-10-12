import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import HeaderComponent from "@/components/common/HeaderComponent";
import BackButton from "@/components/common/BackButton";
import { COLORS } from "@/constants/colors";
import { globalStyles, SPACING } from "@/constants/styles";
import { cycleCountDetailStyles as styles } from "@/components/cycleCount/cycleCountDetailStyles";
import { CycleCountItemCard } from "@/components/cycleCount/CycleCountItemCard";
import { AssignCycleCountModal, EditCountItemModal, SubmitCycleCountModal } from "@/components/cycleCount/CycleCountDetailModals";
import { useAuth } from "@/hooks/useAuth";
import { showToast } from "@/utils/helpers";
import { getAssignableEmployees } from "@/api/employees.api";
import { approveCycleCount, getCycleCountDetail, scanCycleCountItem, submitCycleCount, transferCycleCount } from "@/api/cycleCounts.api";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import {
    CycleCountItemDetail,
    CycleCountDetailResponse,
} from "@/types/cyclecount.types";
import { Employee } from "@/types/admin.types";
import { getCycleCountStatusStyle } from "./CycleCount";
import { Ionicons } from "@expo/vector-icons";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { formatSignedMoney } from "@/utils/money";

type FilterTab = "FULL" | "PARTIAL" | "NO_COUNT";

export default function CycleCountDetail() {
    const { logout, user } = useAuth();
    const params = useLocalSearchParams();
    const countId = typeof params.id === "string" ? Number(params.id) : NaN;
    const validCountId = Number.isInteger(countId) && countId > 0;

    const [detail, setDetail] = useState<CycleCountDetailResponse | null>(null);
    const [activeTab, setActiveTab] = useState<FilterTab>("FULL");
    const [isLoading, setIsLoading] = useState(validCountId);
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
        if (!validCountId) {
            setIsLoading(false);
            return;
        }
        const data = await getCycleCountDetail(countId, logout);
        if (data) {
            setDetail(data);
        }
        setIsLoading(false);
    }, [countId, validCountId, logout]);

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
        const data = await getAssignableEmployees(user?.role, detail?.count.store_id, logout);
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
        const res = await transferCycleCount(countId, selectedEmployeeId, logout);
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
        const res = await scanCycleCountItem(countId, editingItem.product_id, editQty, editReason.trim() || undefined, logout);
        setIsActionLoading(false);
        if (res === null) return;
        setEditingItem(null);
        fetchDetail();
    };

    const handleSubmitForApproval = async () => {
        setIsActionLoading(true);
        const res = await submitCycleCount(countId, submitNotes.trim() || undefined, logout);
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
                        const res = await approveCycleCount(countId, logout);
                        setIsActionLoading(false);
                        if (res === null) return;
                        fetchDetail();
                        Alert.alert("Approved", "Cycle count approved and inventory updated!");
                    },
                },
            ]
        );
    };

    const handleEditItem = (item: CycleCountItemDetail) => {
        setEditingItem(item);
        setEditQty(item.counted_qty);
        setEditReason(item.reason_code || "");
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
                    <ErrorMessage
                        message={validCountId ? "Couldn't load this cycle count." : "Invalid cycle count ID."}
                        onRetry={validCountId ? retryInitialLoad : undefined}
                    />
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
                    renderItem={({ item }) => (
                        <CycleCountItemCard
                            item={item}
                            canEdit={count.status === "IN PROGRESS" || count.status === "NOT STARTED"}
                            onEdit={handleEditItem}
                        />
                    )}
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

            <EditCountItemModal editingItem={editingItem} setEditingItem={setEditingItem} editQty={editQty} setEditQty={setEditQty} editReason={editReason} setEditReason={setEditReason} isActionLoading={isActionLoading} handleSaveItemQty={handleSaveItemQty} />

            <SubmitCycleCountModal submitModalVisible={submitModalVisible} setSubmitModalVisible={setSubmitModalVisible} submitNotes={submitNotes} setSubmitNotes={setSubmitNotes} isActionLoading={isActionLoading} handleSubmitForApproval={handleSubmitForApproval} />

            <AssignCycleCountModal reassignModalVisible={reassignModalVisible} setReassignModalVisible={setReassignModalVisible} hasOwner={!!detail?.count.counted_by} employees={employees} isLoadingEmployees={isLoadingEmployees} selectedEmployeeId={selectedEmployeeId} setSelectedEmployeeId={setSelectedEmployeeId} isTransferring={isTransferring} handleTransferOwnership={handleTransferOwnership} />
        </TopSafeAreaView>
    );
}
