import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    Modal,
    ScrollView,
    ActivityIndicator,
    Alert,
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import HeaderComponent from "@/components/common/HeaderComponent";
import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { View, Text, StyleSheet } from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import Pagination from "@/components/common/Pagination";
import { ReturnCard } from "@/components/returns/ReturnCard";
import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";
import { ENDPOINTS } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { callApi, showToast } from "@/utils/helpers";
import {
    CustomerReturnSummary,
    CustomerReturnDetailResponse,
    LookupTransactionResponse,
    OriginalTransactionItemForReturn,
    RecentTransactionSummary,
    RefundMethod,
    ReturnDisposition,
    ReturnReason,
    RtvQueueItem,
} from "@/types/returns.types";
import { Ionicons } from "@expo/vector-icons";

type ActiveTab = "NEW_RETURN" | "HISTORY" | "RTV_QUEUE";
type LookupMode = "TRANSACTION_ID" | "PRODUCT_BARCODE";

interface SelectedReturnItem {
    original_transaction_item_id?: number;
    product_id: number;
    product_name: string;
    product_sku: string;
    unit_price: number;
    quantity: number;
    max_returnable: number;
    return_reason: ReturnReason;
    disposition: ReturnDisposition;
    is_outside_policy: boolean;
}

const RETURN_REASONS: ReturnReason[] = [
    "DEFECTIVE",
    "WRONG_ITEM",
    "CHANGED_MIND",
    "DAMAGED_IN_BOX",
    "MISSING_PARTS",
    "WARRANTY_CLAIM",
    "OTHER",
];

const DISPOSITIONS: { key: ReturnDisposition; label: string }[] = [
    { key: "RESTOCK", label: "Restock (New)" },
    { key: "OPEN_BOX", label: "Open Box" },
    { key: "DEFECTIVE_RTV", label: "Defective (RTV)" },
    { key: "DAMAGED_WRITE_OFF", label: "Damaged (Write Off)" },
    { key: "QUARANTINE", label: "Quarantine" },
];

const REFUND_METHODS: RefundMethod[] = ["CASH", "CARD", "GIFT CARD", "STORE_CREDIT"];

export default function Returns() {
    const { logout, user } = useAuth();
    const isManagerOrAdmin = user?.role === "MANAGER" || user?.role === "ADMIN";

    const [activeTab, setActiveTab] = useState<ActiveTab>("NEW_RETURN");

    const [lookupMode, setLookupMode] = useState<LookupMode>("TRANSACTION_ID");
    const [lookupInput, setLookupInput] = useState("");
    const [isSearchingTx, setIsSearchingTx] = useState(false);
    const [foundTx, setFoundTx] = useState<LookupTransactionResponse | null>(null);
    const [recentTxResults, setRecentTxResults] = useState<RecentTransactionSummary[]>([]);

    const [selectedItems, setSelectedItems] = useState<Record<number, SelectedReturnItem>>({});
    const [refundMethod, setRefundMethod] = useState<RefundMethod>("CARD");
    const [returnNotes, setReturnNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittedSuccessModal, setSubmittedSuccessModal] = useState<{
        returnId: number;
        status: string;
        total: number;
    } | null>(null);

    const [historyList, setHistoryList] = useState<CustomerReturnSummary[]>([]);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("ALL");
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const [selectedReturnId, setSelectedReturnId] = useState<number | null>(null);
    const [returnDetail, setReturnDetail] = useState<CustomerReturnDetailResponse | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [isProcessingAction, setIsProcessingAction] = useState(false);

    const [rtvList, setRtvList] = useState<RtvQueueItem[]>([]);
    const [rtvTotal, setRtvTotal] = useState(0);
    const [rtvPage, setRtvPage] = useState(1);
    const [isLoadingRtv, setIsLoadingRtv] = useState(false);

    const handleSearch = async () => {
        const query = lookupInput.trim();
        if (!query) {
            showToast("error", "Please enter a transaction ID or barcode");
            return;
        }

        setIsSearchingTx(true);
        if (lookupMode === "TRANSACTION_ID") {
            const endpoint = ENDPOINTS.SALES_FLOOR.RETURNS.lookup(query);
            const res = await callApi<LookupTransactionResponse>(endpoint, { method: "GET" }, logout);
            if (res) {
                setFoundTx(res);
                setSelectedItems({});
                setRecentTxResults([]);
            }
        } else {
            const endpoint = `${ENDPOINTS.SALES_FLOOR.RETURNS.searchByProduct}?barcode=${encodeURIComponent(query)}`;
            const res = await callApi<{ transactions: RecentTransactionSummary[] }>(endpoint, { method: "GET" }, logout);
            if (res) {
                setRecentTxResults(res.transactions || []);
                setFoundTx(null);
                setSelectedItems({});
            }
        }
        setIsSearchingTx(false);
    };

    const handleSelectTransactionFromList = async (txId: number) => {
        setIsSearchingTx(true);
        const endpoint = ENDPOINTS.SALES_FLOOR.RETURNS.lookup(txId);
        const res = await callApi<LookupTransactionResponse>(endpoint, { method: "GET" }, logout);
        if (res) {
            setFoundTx(res);
            setSelectedItems({});
            setRecentTxResults([]);
        }
        setIsSearchingTx(false);
    };

    const toggleItemSelection = (item: OriginalTransactionItemForReturn) => {
        if (!item.is_returnable || item.returnable_qty <= 0) return;

        setSelectedItems((prev) => {
            const next = { ...prev };
            if (next[item.transaction_item_id]) {
                delete next[item.transaction_item_id];
            } else {
                next[item.transaction_item_id] = {
                    original_transaction_item_id: item.transaction_item_id,
                    product_id: item.product_id,
                    product_name: item.product_name,
                    product_sku: item.product_sku,
                    unit_price: item.unit_price,
                    quantity: 1,
                    max_returnable: item.returnable_qty,
                    return_reason: "DEFECTIVE",
                    disposition: "DEFECTIVE_RTV",
                    is_outside_policy: item.is_outside_policy_window,
                };
            }
            return next;
        });
    };

    const updateItemQuantity = (txItemId: number, delta: number) => {
        setSelectedItems((prev) => {
            const current = prev[txItemId];
            if (!current) return prev;
            const newQty = current.quantity + delta;
            if (newQty < 1 || newQty > current.max_returnable) return prev;
            return {
                ...prev,
                [txItemId]: { ...current, quantity: newQty },
            };
        });
    };

    const updateItemReason = (txItemId: number, reason: ReturnReason) => {
        setSelectedItems((prev) => {
            const current = prev[txItemId];
            if (!current) return prev;
            return {
                ...prev,
                [txItemId]: { ...current, return_reason: reason },
            };
        });
    };

    const updateItemDisposition = (txItemId: number, disposition: ReturnDisposition) => {
        setSelectedItems((prev) => {
            const current = prev[txItemId];
            if (!current) return prev;
            return {
                ...prev,
                [txItemId]: { ...current, disposition },
            };
        });
    };

    const selectedItemsArray = Object.values(selectedItems);
    const subtotal = selectedItemsArray.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const estimatedTax = subtotal * 0.05;
    const totalRefund = subtotal + estimatedTax;

    const hasExpiredItem = selectedItemsArray.some((item) => item.is_outside_policy);

    useEffect(() => {
        if (hasExpiredItem && refundMethod !== "STORE_CREDIT") {
            setRefundMethod("STORE_CREDIT");
        }
    }, [hasExpiredItem]);

    const handleSubmitReturn = async () => {
        if (selectedItemsArray.length === 0) {
            showToast("error", "Select at least one item to return");
            return;
        }

        if (hasExpiredItem && refundMethod !== "STORE_CREDIT") {
            showToast("error", "Expired items must be refunded via Store Credit");
            return;
        }

        setIsSubmitting(true);
        const endpoint = ENDPOINTS.SALES_FLOOR.RETURNS.create;
        const body = {
            original_transaction_id: foundTx?.transaction_id,
            refund_method: refundMethod,
            notes: returnNotes.trim() ? returnNotes.trim() : undefined,
            items: selectedItemsArray.map((item) => ({
                product_id: item.product_id,
                original_transaction_item_id: item.original_transaction_item_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                return_reason: item.return_reason,
                disposition: item.disposition,
            })),
        };

        const res = await callApi<{ return_id: number; status: string; total_refund: number }>(
            endpoint,
            { method: "POST", body },
            logout
        );

        setIsSubmitting(false);

        if (res) {
            setSubmittedSuccessModal({
                returnId: res.return_id,
                status: res.status,
                total: res.total_refund,
            });
            setFoundTx(null);
            setSelectedItems({});
            setReturnNotes("");
            setLookupInput("");
        }
    };

    const fetchHistory = useCallback(async () => {
        setIsLoadingHistory(true);
        let endpoint = `${ENDPOINTS.SALES_FLOOR.RETURNS.getAll}?page=${historyPage}&limit=10`;
        if (historyStatusFilter !== "ALL") {
            endpoint += `&status=${historyStatusFilter}`;
        }

        const res = await callApi<{ returns: CustomerReturnSummary[]; total_length: number }>(
            endpoint,
            { method: "GET" },
            logout
        );

        if (res) {
            setHistoryList(res.returns || []);
            setHistoryTotal(res.total_length || 0);
        }
        setIsLoadingHistory(false);
    }, [historyPage, historyStatusFilter, logout]);

    const fetchReturnDetail = useCallback(
        async (returnId: number) => {
            setIsLoadingDetail(true);
            const endpoint = ENDPOINTS.SALES_FLOOR.RETURNS.getDetail(returnId);
            const res = await callApi<CustomerReturnDetailResponse>(endpoint, { method: "GET" }, logout);
            if (res) {
                setReturnDetail(res);
            }
            setIsLoadingDetail(false);
        },
        [logout]
    );

    const fetchRtvQueue = useCallback(async () => {
        setIsLoadingRtv(true);
        const endpoint = `${ENDPOINTS.SALES_FLOOR.RETURNS.rtv}?page=${rtvPage}&limit=15`;
        const res = await callApi<{ rtv_queue: RtvQueueItem[]; total_length: number }>(
            endpoint,
            { method: "GET" },
            logout
        );
        if (res) {
            setRtvList(res.rtv_queue || []);
            setRtvTotal(res.total_length || 0);
        }
        setIsLoadingRtv(false);
    }, [rtvPage, logout]);

    useEffect(() => {
        if (activeTab === "HISTORY") {
            fetchHistory();
        } else if (activeTab === "RTV_QUEUE") {
            fetchRtvQueue();
        }
    }, [activeTab, fetchHistory, fetchRtvQueue]);

    const handleOpenDetail = (returnId: number) => {
        setSelectedReturnId(returnId);
        fetchReturnDetail(returnId);
    };

    const handleApproveReturn = async (returnId: number) => {
        setIsProcessingAction(true);
        const endpoint = ENDPOINTS.SALES_FLOOR.RETURNS.approve(returnId);
        const res = await callApi<{ message: string }>(endpoint, { method: "POST" }, logout);
        setIsProcessingAction(false);
        if (res) {
            showToast("success", "Return approved successfully");
            fetchReturnDetail(returnId);
            fetchHistory();
        }
    };

    const handleRejectReturn = (returnId: number) => {
        Alert.prompt
            ? Alert.prompt("Reject Return", "Enter reason for rejection:", [
                  { text: "Cancel", style: "cancel" },
                  {
                      text: "Reject",
                      style: "destructive",
                      onPress: async (reason?: string) => {
                          setIsProcessingAction(true);
                          const endpoint = ENDPOINTS.SALES_FLOOR.RETURNS.reject(returnId);
                          const res = await callApi<{ message: string }>(
                              endpoint,
                              { method: "POST", body: { reason: reason || "Manager rejected" } },
                              logout
                          );
                          setIsProcessingAction(false);
                          if (res) {
                              showToast("success", "Return rejected");
                              fetchReturnDetail(returnId);
                              fetchHistory();
                          }
                      },
                  },
              ])
            : Alert.alert("Reject Return", "Are you sure you want to reject this return?", [
                  { text: "Cancel", style: "cancel" },
                  {
                      text: "Reject",
                      style: "destructive",
                      onPress: async () => {
                          setIsProcessingAction(true);
                          const endpoint = ENDPOINTS.SALES_FLOOR.RETURNS.reject(returnId);
                          const res = await callApi<{ message: string }>(
                              endpoint,
                              { method: "POST", body: { reason: "Manager rejected" } },
                              logout
                          );
                          setIsProcessingAction(false);
                          if (res) {
                              showToast("success", "Return rejected");
                              fetchReturnDetail(returnId);
                              fetchHistory();
                          }
                      },
                  },
              ]);
    };

    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerLeft={(<BackButton />)}
                headerCenter={(
                    <View style={{ flexDirection: 'row' }}>
                        <Text>Returns</Text>
                headerLeft={<BackButton />}
                headerCenter={
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Customer Returns & RMA</Text>
                    </View>
                )} />
            <View style={styles.container}>
                <Text>Returns</Text>
                }
            />

            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === "NEW_RETURN" && styles.tabButtonActive]}
                    onPress={() => setActiveTab("NEW_RETURN")}
                >
                    <Ionicons
                        name="return-down-back"
                        size={16}
                        color={activeTab === "NEW_RETURN" ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text style={[styles.tabText, activeTab === "NEW_RETURN" && styles.tabTextActive]}>
                        Process Return
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabButton, activeTab === "HISTORY" && styles.tabButtonActive]}
                    onPress={() => setActiveTab("HISTORY")}
                >
                    <Ionicons
                        name="receipt-outline"
                        size={16}
                        color={activeTab === "HISTORY" ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text style={[styles.tabText, activeTab === "HISTORY" && styles.tabTextActive]}>
                        History
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabButton, activeTab === "RTV_QUEUE" && styles.tabButtonActive]}
                    onPress={() => setActiveTab("RTV_QUEUE")}
                >
                    <Ionicons
                        name="cube-outline"
                        size={16}
                        color={activeTab === "RTV_QUEUE" ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text style={[styles.tabText, activeTab === "RTV_QUEUE" && styles.tabTextActive]}>
                        RTV Queue
                    </Text>
                </TouchableOpacity>
            </View>

            {activeTab === "NEW_RETURN" && (
                <ScrollView style={styles.contentContainer} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.lookupCard}>
                        <View style={styles.lookupModeRow}>
                            <TouchableOpacity
                                style={[
                                    styles.modeToggle,
                                    lookupMode === "TRANSACTION_ID" && styles.modeToggleActive,
                                ]}
                                onPress={() => setLookupMode("TRANSACTION_ID")}
                            >
                                <Ionicons
                                    name="receipt-outline"
                                    size={14}
                                    color={lookupMode === "TRANSACTION_ID" ? COLORS.primary : COLORS.textSecondary}
                                />
                                <Text
                                    style={[
                                        styles.modeToggleText,
                                        lookupMode === "TRANSACTION_ID" && styles.modeToggleTextActive,
                                    ]}
                                >
                                    Receipt Lookup
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.modeToggle,
                                    lookupMode === "PRODUCT_BARCODE" && styles.modeToggleActive,
                                ]}
                                onPress={() => setLookupMode("PRODUCT_BARCODE")}
                            >
                                <Ionicons
                                    name="barcode-outline"
                                    size={14}
                                    color={lookupMode === "PRODUCT_BARCODE" ? COLORS.primary : COLORS.textSecondary}
                                />
                                <Text
                                    style={[
                                        styles.modeToggleText,
                                        lookupMode === "PRODUCT_BARCODE" && styles.modeToggleTextActive,
                                    ]}
                                >
                                    Product Scan
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchInputRow}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder={
                                    lookupMode === "TRANSACTION_ID"
                                        ? "Enter Transaction ID (e.g. 1042)..."
                                        : "Enter UPC or SKU..."
                                }
                                placeholderTextColor={COLORS.placeholder}
                                value={lookupInput}
                                onChangeText={setLookupInput}
                                keyboardType={lookupMode === "TRANSACTION_ID" ? "number-pad" : "default"}
                                returnKeyType="search"
                                onSubmitEditing={handleSearch}
                            />
                            <TouchableOpacity
                                style={styles.searchButton}
                                onPress={handleSearch}
                                disabled={isSearchingTx}
                            >
                                {isSearchingTx ? (
                                    <ActivityIndicator size="small" color={COLORS.primaryText} />
                                ) : (
                                    <Ionicons name="search" size={18} color={COLORS.primaryText} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {recentTxResults.length > 0 && (
                        <View style={styles.recentResultsContainer}>
                            <Text style={styles.sectionHeader}>Recent Purchases for this Product</Text>
                            {recentTxResults.map((tx) => (
                                <TouchableOpacity
                                    key={tx.transaction_id}
                                    style={styles.recentTxItem}
                                    onPress={() => handleSelectTransactionFromList(tx.transaction_id)}
                                >
                                    <View>
                                        <Text style={styles.recentTxId}>Sale #{tx.transaction_id}</Text>
                                        <Text style={styles.recentTxDate}>
                                            {new Date(tx.created_at).toLocaleDateString()} • Register {tx.register_id}
                                        </Text>
                                    </View>
                                    <View style={styles.recentTxRight}>
                                        <Text style={styles.recentTxAmount}>${tx.total_amount.toFixed(2)}</Text>
                                        <Text style={styles.recentTxQty}>Qty: {tx.quantity_sold}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {foundTx && (
                        <View style={styles.txSummaryBanner}>
                            <View style={styles.txSummaryLeft}>
                                <Text style={styles.txSummaryId}>Sale #{foundTx.transaction_id}</Text>
                                <Text style={styles.txSummaryDate}>
                                    Purchased {foundTx.days_since_sale} days ago ({new Date(foundTx.created_at).toLocaleDateString()})
                                </Text>
                            </View>
                            <View style={styles.txSummaryRight}>
                                <Text style={styles.txSummaryAmount}>${foundTx.total_amount.toFixed(2)}</Text>
                                <Text style={styles.txSummaryMethod}>{foundTx.payment_method}</Text>
                            </View>
                        </View>
                    )}

                    {foundTx && (
                        <View style={styles.itemsSection}>
                            <Text style={styles.sectionHeader}>Select Items to Return</Text>
                            {foundTx.items.map((item) => {
                                const isSelected = !!selectedItems[item.transaction_item_id];
                                const selectedData = selectedItems[item.transaction_item_id];
                                const canReturn = item.is_returnable && item.returnable_qty > 0;

                                return (
                                    <View
                                        key={item.transaction_item_id}
                                        style={[
                                            styles.saleItemCard,
                                            isSelected && styles.saleItemCardSelected,
                                            !canReturn && styles.saleItemCardDisabled,
                                        ]}
                                    >
                                        <TouchableOpacity
                                            style={styles.itemHeaderRow}
                                            onPress={() => toggleItemSelection(item)}
                                            disabled={!canReturn}
                                        >
                                            <Ionicons
                                                name={
                                                    isSelected
                                                        ? "checkbox"
                                                        : canReturn
                                                        ? "square-outline"
                                                        : "close-circle-outline"
                                                }
                                                size={22}
                                                color={
                                                    isSelected
                                                        ? COLORS.primary
                                                        : canReturn
                                                        ? COLORS.textSecondary
                                                        : COLORS.inactiveTint
                                                }
                                            />
                                            <View style={styles.itemInfo}>
                                                <Text style={styles.itemName}>{item.product_name}</Text>
                                                <Text style={styles.itemMeta}>
                                                    SKU: {item.product_sku} • ${item.unit_price.toFixed(2)} ea
                                                </Text>
                                            </View>
                                            <View style={styles.itemQtyBadge}>
                                                <Text style={styles.itemQtyBadgeText}>
                                                    {item.returnable_qty} of {item.purchased_qty} left
                                                </Text>
                                            </View>
                                        </TouchableOpacity>

                                        <View style={styles.policyRow}>
                                            <Ionicons
                                                name={item.is_outside_policy_window ? "alert-circle" : "shield-checkmark"}
                                                size={13}
                                                color={item.is_outside_policy_window ? "#E65100" : COLORS.success}
                                            />
                                            <Text
                                                style={[
                                                    styles.policyText,
                                                    item.is_outside_policy_window && styles.policyTextWarning,
                                                ]}
                                            >
                                                {item.is_outside_policy_window
                                                    ? `Past ${item.return_window_days}-day return window (Store Credit Required)`
                                                    : `Within ${item.return_window_days}-day window`}
                                            </Text>
                                        </View>

                                        {isSelected && selectedData && (
                                            <View style={styles.itemConfigContainer}>
                                                <View style={styles.configRow}>
                                                    <Text style={styles.configLabel}>Return Qty:</Text>
                                                    <View style={styles.stepper}>
                                                        <TouchableOpacity
                                                            style={styles.stepperButton}
                                                            onPress={() =>
                                                                updateItemQuantity(item.transaction_item_id, -1)
                                                            }
                                                        >
                                                            <Text style={styles.stepperButtonText}>-</Text>
                                                        </TouchableOpacity>
                                                        <Text style={styles.stepperValue}>
                                                            {selectedData.quantity}
                                                        </Text>
                                                        <TouchableOpacity
                                                            style={styles.stepperButton}
                                                            onPress={() =>
                                                                updateItemQuantity(item.transaction_item_id, 1)
                                                            }
                                                        >
                                                            <Text style={styles.stepperButtonText}>+</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>

                                                <View style={styles.configRowVertical}>
                                                    <Text style={styles.configLabel}>Reason:</Text>
                                                    <ScrollView
                                                        horizontal
                                                        showsHorizontalScrollIndicator={false}
                                                        style={styles.pillScroll}
                                                    >
                                                        {RETURN_REASONS.map((r) => (
                                                            <TouchableOpacity
                                                                key={r}
                                                                style={[
                                                                    styles.pill,
                                                                    selectedData.return_reason === r &&
                                                                        styles.pillActive,
                                                                ]}
                                                                onPress={() =>
                                                                    updateItemReason(item.transaction_item_id, r)
                                                                }
                                                            >
                                                                <Text
                                                                    style={[
                                                                        styles.pillText,
                                                                        selectedData.return_reason === r &&
                                                                            styles.pillTextActive,
                                                                    ]}
                                                                >
                                                                    {r.replace("_", " ")}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </ScrollView>
                                                </View>

                                                <View style={styles.configRowVertical}>
                                                    <Text style={styles.configLabel}>Disposition:</Text>
                                                    <ScrollView
                                                        horizontal
                                                        showsHorizontalScrollIndicator={false}
                                                        style={styles.pillScroll}
                                                    >
                                                        {DISPOSITIONS.map((d) => (
                                                            <TouchableOpacity
                                                                key={d.key}
                                                                style={[
                                                                    styles.pill,
                                                                    selectedData.disposition === d.key &&
                                                                        styles.pillActive,
                                                                ]}
                                                                onPress={() =>
                                                                    updateItemDisposition(
                                                                        item.transaction_item_id,
                                                                        d.key
                                                                    )
                                                                }
                                                            >
                                                                <Text
                                                                    style={[
                                                                        styles.pillText,
                                                                        selectedData.disposition === d.key &&
                                                                            styles.pillTextActive,
                                                                    ]}
                                                                >
                                                                    {d.label}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </ScrollView>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {selectedItemsArray.length > 0 && (
                        <View style={styles.refundCalculationCard}>
                            <Text style={styles.sectionHeader}>Refund Summary</Text>

                            <View style={styles.calcRow}>
                                <Text style={styles.calcLabel}>Subtotal ({selectedItemsArray.length} items):</Text>
                                <Text style={styles.calcValue}>${subtotal.toFixed(2)}</Text>
                            </View>
                            <View style={styles.calcRow}>
                                <Text style={styles.calcLabel}>Estimated Tax (5%):</Text>
                                <Text style={styles.calcValue}>${estimatedTax.toFixed(2)}</Text>
                            </View>
                            <View style={[styles.calcRow, styles.calcRowTotal]}>
                                <Text style={styles.totalRefundLabel}>Total Refund:</Text>
                                <Text style={styles.totalRefundValue}>${totalRefund.toFixed(2)}</Text>
                            </View>

                            {totalRefund > 50 && !isManagerOrAdmin && (
                                <View style={styles.approvalNotice}>
                                    <Ionicons name="information-circle" size={16} color="#E65100" />
                                    <Text style={styles.approvalNoticeText}>
                                        Total exceeds $50.00. This return will be queued for Manager Approval.
                                    </Text>
                                </View>
                            )}

                            <View style={styles.methodContainer}>
                                <Text style={styles.methodTitle}>Refund Method:</Text>
                                <View style={styles.methodButtonsRow}>
                                    {REFUND_METHODS.map((m) => {
                                        const isDisabled = hasExpiredItem && m !== "STORE_CREDIT";
                                        const isSelected = refundMethod === m;
                                        return (
                                            <TouchableOpacity
                                                key={m}
                                                style={[
                                                    styles.methodButton,
                                                    isSelected && styles.methodButtonSelected,
                                                    isDisabled && styles.methodButtonDisabled,
                                                ]}
                                                onPress={() => !isDisabled && setRefundMethod(m)}
                                                disabled={isDisabled}
                                            >
                                                <Text
                                                    style={[
                                                        styles.methodButtonText,
                                                        isSelected && styles.methodButtonTextSelected,
                                                        isDisabled && styles.methodButtonTextDisabled,
                                                    ]}
                                                >
                                                    {m.replace("_", " ")}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            <TextInput
                                style={styles.notesInput}
                                placeholder="Optional return notes or reason details..."
                                placeholderTextColor={COLORS.placeholder}
                                value={returnNotes}
                                onChangeText={setReturnNotes}
                                multiline
                            />

                            <TouchableOpacity
                                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                                onPress={handleSubmitReturn}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator size="small" color={COLORS.primaryText} />
                                ) : (
                                    <Text style={styles.submitButtonText}>
                                        Process Return (${totalRefund.toFixed(2)})
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            )}

            {activeTab === "HISTORY" && (
                <View style={styles.contentContainer}>
                    <View style={styles.filterPillsRow}>
                        {["ALL", "PENDING_APPROVAL", "COMPLETED", "REJECTED"].map((st) => (
                            <TouchableOpacity
                                key={st}
                                style={[
                                    styles.filterPill,
                                    historyStatusFilter === st && styles.filterPillActive,
                                ]}
                                onPress={() => {
                                    setHistoryStatusFilter(st);
                                    setHistoryPage(1);
                                }}
                            >
                                <Text
                                    style={[
                                        styles.filterPillText,
                                        historyStatusFilter === st && styles.filterPillTextActive,
                                    ]}
                                >
                                    {st.replace("_", " ")}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {isLoadingHistory ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                        </View>
                    ) : historyList.length === 0 ? (
                        <View style={styles.centerContainer}>
                            <Ionicons name="receipt-outline" size={48} color={COLORS.inactiveTint} />
                            <Text style={styles.emptyText}>No returns found</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={historyList}
                            keyExtractor={(item) => String(item.return_id)}
                            renderItem={({ item }) => (
                                <ReturnCard returnItem={item} onPress={handleOpenDetail} />
                            )}
                            contentContainerStyle={styles.listContent}
                            ListFooterComponent={
                                <Pagination
                                    currentPage={historyPage}
                                    totalPages={Math.max(1, Math.ceil(historyTotal / 10))}
                                    onPageChange={setHistoryPage}
                                />
                            }
                        />
                    )}
                </View>
            )}

            {activeTab === "RTV_QUEUE" && (
                <View style={styles.contentContainer}>
                    {isLoadingRtv ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                        </View>
                    ) : rtvList.length === 0 ? (
                        <View style={styles.centerContainer}>
                            <Ionicons name="cube-outline" size={48} color={COLORS.inactiveTint} />
                            <Text style={styles.emptyText}>No items currently in RTV Queue</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={rtvList}
                            keyExtractor={(item) => String(item.rtv_id)}
                            renderItem={({ item }) => (
                                <View style={[globalStyles.card, styles.rtvCard]}>
                                    <View style={styles.rtvCardHeader}>
                                        <View>
                                            <Text style={styles.rtvProductName}>{item.product_name}</Text>
                                            <Text style={styles.rtvSku}>
                                                SKU: {item.sku} • UPC: {item.upc}
                                            </Text>
                                        </View>
                                        <View style={styles.rtvBadge}>
                                            <Text style={styles.rtvBadgeText}>{item.status}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.rtvCardFooter}>
                                        <Text style={styles.rtvQty}>Qty: {item.quantity}</Text>
                                        {item.supplier_name && (
                                            <Text style={styles.rtvSupplier}>Vendor: {item.supplier_name}</Text>
                                        )}
                                        <Text style={styles.rtvDate}>
                                            Queued: {new Date(item.created_at).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>
                            )}
                            contentContainerStyle={styles.listContent}
                            ListFooterComponent={
                                <Pagination
                                    currentPage={rtvPage}
                                    totalPages={Math.max(1, Math.ceil(rtvTotal / 15))}
                                    onPageChange={setRtvPage}
                                />
                            }
                        />
                    )}
                </View>
            )}

            <Modal
                visible={!!submittedSuccessModal}
                transparent
                animationType="fade"
                onRequestClose={() => setSubmittedSuccessModal(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.successModalContent}>
                        <Ionicons name="checkmark-circle" size={56} color={COLORS.success} />
                        <Text style={styles.successTitle}>Return Processed</Text>
                        <Text style={styles.successReturnId}>Return #{submittedSuccessModal?.returnId}</Text>
                        <Text style={styles.successAmount}>
                            Refund: ${submittedSuccessModal?.total.toFixed(2)}
                        </Text>
                        <Text style={styles.successStatus}>
                            Status: {submittedSuccessModal?.status.replace("_", " ")}
                        </Text>
                        {submittedSuccessModal?.status === "PENDING_APPROVAL" && (
                            <Text style={styles.successNote}>
                                This return requires manager approval because the amount exceeds $50.00.
                            </Text>
                        )}
                        <TouchableOpacity
                            style={styles.successButton}
                            onPress={() => setSubmittedSuccessModal(null)}
                        >
                            <Text style={styles.successButtonText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={!!selectedReturnId}
                transparent
                animationType="slide"
                onRequestClose={() => setSelectedReturnId(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.detailModalContent}>
                        <View style={styles.detailModalHeader}>
                            <Text style={styles.detailModalTitle}>Return #{selectedReturnId}</Text>
                            <TouchableOpacity onPress={() => setSelectedReturnId(null)}>
                                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {isLoadingDetail ? (
                            <View style={styles.centerContainer}>
                                <ActivityIndicator size="large" color={COLORS.primary} />
                            </View>
                        ) : returnDetail ? (
                            <ScrollView style={styles.detailModalBody}>
                                <View style={styles.detailSummaryBox}>
                                    <View style={styles.detailSummaryRow}>
                                        <Text style={styles.detailSummaryLabel}>Status:</Text>
                                        <Text style={styles.detailSummaryValue}>
                                            {returnDetail.return.status.replace("_", " ")}
                                        </Text>
                                    </View>
                                    <View style={styles.detailSummaryRow}>
                                        <Text style={styles.detailSummaryLabel}>Refund Method:</Text>
                                        <Text style={styles.detailSummaryValue}>
                                            {returnDetail.return.refund_method.replace("_", " ")}
                                        </Text>
                                    </View>
                                    <View style={styles.detailSummaryRow}>
                                        <Text style={styles.detailSummaryLabel}>Total Refund:</Text>
                                        <Text style={styles.detailSummaryTotal}>
                                            ${returnDetail.return.total_refund.toFixed(2)}
                                        </Text>
                                    </View>
                                    <View style={styles.detailSummaryRow}>
                                        <Text style={styles.detailSummaryLabel}>Processed By:</Text>
                                        <Text style={styles.detailSummaryValue}>
                                            {returnDetail.return.employee_name}
                                        </Text>
                                    </View>
                                    {returnDetail.return.approved_by_name && (
                                        <View style={styles.detailSummaryRow}>
                                            <Text style={styles.detailSummaryLabel}>Approved By:</Text>
                                            <Text style={styles.detailSummaryValue}>
                                                {returnDetail.return.approved_by_name}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <Text style={styles.itemsListTitle}>Returned Items</Text>
                                {returnDetail.items.map((item) => (
                                    <View key={item.return_item_id} style={styles.detailItemRow}>
                                        <View style={styles.detailItemLeft}>
                                            <Text style={styles.detailItemName}>{item.product_name}</Text>
                                            <Text style={styles.detailItemSku}>SKU: {item.sku}</Text>
                                            <Text style={styles.detailItemReason}>
                                                Reason: {item.return_reason.replace("_", " ")}
                                            </Text>
                                            <Text style={styles.detailItemDisposition}>
                                                Disposition: {item.disposition.replace("_", " ")}
                                            </Text>
                                        </View>
                                        <View style={styles.detailItemRight}>
                                            <Text style={styles.detailItemQty}>Qty: {item.quantity}</Text>
                                            <Text style={styles.detailItemPrice}>
                                                ${(item.unit_price * item.quantity).toFixed(2)}
                                            </Text>
                                        </View>
                                    </View>
                                ))}

                                {returnDetail.return.status === "PENDING_APPROVAL" && isManagerOrAdmin && (
                                    <View style={styles.managerActionRow}>
                                        <TouchableOpacity
                                            style={[
                                                styles.actionBtn,
                                                styles.rejectBtn,
                                                isProcessingAction && styles.submitButtonDisabled,
                                            ]}
                                            onPress={() => handleRejectReturn(returnDetail.return.return_id)}
                                            disabled={isProcessingAction}
                                        >
                                            <Text style={styles.actionBtnText}>Reject</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.actionBtn,
                                                styles.approveBtn,
                                                isProcessingAction && styles.submitButtonDisabled,
                                            ]}
                                            onPress={() => handleApproveReturn(returnDetail.return.return_id)}
                                            disabled={isProcessingAction}
                                        >
                                            <Text style={styles.actionBtnText}>Approve</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </ScrollView>
                        ) : null}
                    </View>
                </View>
            </Modal>
        </TopSafeAreaView>
    )
    );
}

const styles = StyleSheet.create({
    container: {
    headerTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    tabBar: {
        flexDirection: "row",
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingHorizontal: 8,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        gap: 6,
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    title: {
    }
})
    tabButtonActive: {
        borderBottomColor: COLORS.primary,
    },
    tabText: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    tabTextActive: {
        color: COLORS.primary,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        padding: 12,
        gap: 12,
        paddingBottom: 40,
    },
    lookupCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 8,
        padding: 12,
        gap: 10,
        elevation: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    lookupModeRow: {
        flexDirection: "row",
        backgroundColor: COLORS.neutralBg,
        borderRadius: 6,
        padding: 2,
    },
    modeToggle: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
        gap: 6,
        borderRadius: 4,
    },
    modeToggleActive: {
        backgroundColor: COLORS.surface,
    },
    modeToggleText: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    modeToggleTextActive: {
        color: COLORS.primary,
    },
    searchInputRow: {
        flexDirection: "row",
        gap: 8,
    },
    searchInput: {
        flex: 1,
        height: 44,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        borderRadius: 6,
        paddingHorizontal: 12,
        backgroundColor: COLORS.inputBg,
        color: COLORS.textPrimary,
        fontSize: 14,
    },
    searchButton: {
        width: 44,
        height: 44,
        backgroundColor: COLORS.primary,
        borderRadius: 6,
        alignItems: "center",
        justifyContent: "center",
    },
    recentResultsContainer: {
        backgroundColor: COLORS.surface,
        borderRadius: 8,
        padding: 12,
        gap: 8,
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    recentTxItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    recentTxId: {
        fontSize: 14,
        fontWeight: "700",
        color: COLORS.primary,
    },
    recentTxDate: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    recentTxRight: {
        alignItems: "flex-end",
    },
    recentTxAmount: {
        fontSize: 14,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    recentTxQty: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    txSummaryBanner: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#E3F2FD",
        borderRadius: 8,
        padding: 12,
        borderLeftWidth: 4,
        borderLeftColor: "#1976D2",
    },
    txSummaryLeft: {
        flex: 1,
    },
    txSummaryId: {
        fontSize: 15,
        fontWeight: "700",
        color: "#0D47A1",
    },
    txSummaryDate: {
        fontSize: 12,
        color: "#1565C0",
        marginTop: 2,
    },
    txSummaryRight: {
        alignItems: "flex-end",
    },
    txSummaryAmount: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0D47A1",
    },
    txSummaryMethod: {
        fontSize: 12,
        color: "#1565C0",
    },
    itemsSection: {
        gap: 8,
    },
    saleItemCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 8,
    },
    saleItemCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: "#FFF9F9",
    },
    saleItemCardDisabled: {
        opacity: 0.5,
    },
    itemHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 14,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    itemMeta: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    itemQtyBadge: {
        backgroundColor: COLORS.neutralBg,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    itemQtyBadgeText: {
        fontSize: 11,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    policyRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingLeft: 32,
    },
    policyText: {
        fontSize: 11,
        color: COLORS.success,
        fontWeight: "500",
    },
    policyTextWarning: {
        color: "#E65100",
        fontWeight: "600",
    },
    itemConfigContainer: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        gap: 8,
        paddingLeft: 32,
    },
    configRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    configRowVertical: {
        gap: 4,
    },
    configLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    stepper: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 6,
        overflow: "hidden",
    },
    stepperButton: {
        width: 32,
        height: 30,
        backgroundColor: COLORS.neutralBg,
        alignItems: "center",
        justifyContent: "center",
    },
    stepperButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    stepperValue: {
        paddingHorizontal: 12,
        fontSize: 14,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    pillScroll: {
        flexDirection: "row",
        gap: 6,
    },
    pill: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
        backgroundColor: COLORS.neutralBg,
        marginRight: 6,
    },
    pillActive: {
        backgroundColor: COLORS.primary,
    },
    pillText: {
        fontSize: 11,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    pillTextActive: {
        color: COLORS.primaryText,
    },
    refundCalculationCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 8,
        padding: 14,
        gap: 10,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    calcRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    calcRowTotal: {
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 8,
        marginTop: 4,
    },
    calcLabel: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    calcValue: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    totalRefundLabel: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    totalRefundValue: {
        fontSize: 18,
        fontWeight: "800",
        color: COLORS.primary,
    },
    approvalNotice: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#FFF3E0",
        padding: 8,
        borderRadius: 6,
    },
    approvalNoticeText: {
        fontSize: 12,
        color: "#E65100",
        fontWeight: "500",
        flex: 1,
    },
    methodContainer: {
        gap: 6,
        marginTop: 6,
    },
    methodTitle: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    methodButtonsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    methodButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.inputBg,
    },
    methodButtonSelected: {
        borderColor: COLORS.primary,
        backgroundColor: "#FFEBEE",
    },
    methodButtonDisabled: {
        opacity: 0.35,
    },
    methodButtonText: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    methodButtonTextSelected: {
        color: COLORS.primary,
    },
    methodButtonTextDisabled: {
        color: COLORS.placeholder,
    },
    notesInput: {
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        borderRadius: 6,
        padding: 10,
        height: 60,
        backgroundColor: COLORS.inputBg,
        fontSize: 13,
        color: COLORS.textPrimary,
        textAlignVertical: "top",
    },
    submitButton: {
        height: 48,
        backgroundColor: COLORS.primary,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 6,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.primaryText,
    },
    filterPillsRow: {
        flexDirection: "row",
        padding: 12,
        backgroundColor: COLORS.surface,
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    filterPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: COLORS.neutralBg,
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
        color: COLORS.primaryText,
    },
    listContent: {
        padding: 12,
        gap: 10,
    },
    centerContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    rtvCard: {
        padding: 12,
        gap: 8,
    },
    rtvCardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    rtvProductName: {
        fontSize: 14,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    rtvSku: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    rtvBadge: {
        backgroundColor: "#FFF3E0",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    rtvBadgeText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#E65100",
    },
    rtvCardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 8,
    },
    rtvQty: {
        fontSize: 13,
        fontWeight: "700",
        color: COLORS.primary,
    },
    rtvSupplier: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    rtvDate: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    successModalContent: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 24,
        alignItems: "center",
        gap: 8,
        width: "100%",
        maxWidth: 340,
    },
    successTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: COLORS.textPrimary,
        marginTop: 8,
    },
    successReturnId: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.primary,
    },
    successAmount: {
        fontSize: 22,
        fontWeight: "800",
        color: COLORS.textPrimary,
    },
    successStatus: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    successNote: {
        fontSize: 12,
        color: "#E65100",
        textAlign: "center",
        marginTop: 4,
    },
    successButton: {
        height: 44,
        backgroundColor: COLORS.primary,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        marginTop: 16,
    },
    successButtonText: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.primaryText,
    },
    detailModalContent: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        width: "100%",
        maxHeight: "85%",
        overflow: "hidden",
    },
    detailModalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    detailModalTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    detailModalBody: {
        padding: 16,
    },
    detailSummaryBox: {
        backgroundColor: COLORS.neutralBg,
        borderRadius: 8,
        padding: 12,
        gap: 6,
        marginBottom: 16,
    },
    detailSummaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    detailSummaryLabel: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    detailSummaryValue: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    detailSummaryTotal: {
        fontSize: 15,
        fontWeight: "800",
        color: COLORS.primary,
    },
    itemsListTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    detailItemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    detailItemLeft: {
        flex: 1,
    },
    detailItemName: {
        fontSize: 13,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    detailItemSku: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginTop: 1,
    },
    detailItemReason: {
        fontSize: 11,
        color: COLORS.accent,
        marginTop: 2,
    },
    detailItemDisposition: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginTop: 1,
    },
    detailItemRight: {
        alignItems: "flex-end",
    },
    detailItemQty: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    detailItemPrice: {
        fontSize: 14,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginTop: 2,
    },
    managerActionRow: {
        flexDirection: "row",
        gap: 12,
        marginTop: 20,
        marginBottom: 20,
    },
    actionBtn: {
        flex: 1,
        height: 44,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    approveBtn: {
        backgroundColor: COLORS.success,
    },
    rejectBtn: {
        backgroundColor: COLORS.danger,
    },
    actionBtnText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#FFFFFF",
    },
});
