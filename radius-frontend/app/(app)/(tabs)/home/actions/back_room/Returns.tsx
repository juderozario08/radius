import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import Pagination from "@/components/common/Pagination";
import { ReturnCard } from "@/components/returns/ReturnCard";
import { ReturnSaleItemCard, SelectedReturnItem } from "@/components/returns/ReturnSaleItemCard";
import { ReturnSuccessModal } from "@/components/returns/ReturnSuccessModal";
import { ReturnDetailModal } from "@/components/returns/ReturnDetailModal";
import { ReturnRejectModal } from "@/components/returns/ReturnRejectModal";
import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";
import { returnScreenStyles as styles } from "@/components/returns/returnScreenStyles";
import { useAuth } from "@/hooks/useAuth";
import { showToast } from "@/utils/helpers";
import { approveReturn, createReturn, getReturnDetail, getReturnHistory, getRtvQueue, lookupReturnTransaction, rejectReturnRequest, searchReturnTransactions } from "@/api/returns.api";
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
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { type Money, formatMoney, multiplyMoney, prorateMoney, sumMoney } from "@/utils/money";

type ActiveTab = "NEW_RETURN" | "HISTORY" | "RTV_QUEUE";
type LookupMode = "TRANSACTION_ID" | "PRODUCT_BARCODE";

const REFUND_METHODS: RefundMethod[] = ["CASH", "CARD", "GIFT CARD", "STORE_CREDIT"];

function receiptRefundTax(tx: LookupTransactionResponse, refundSubtotal: Money): Money {
    const taxRefundedSoFar = prorateMoney(tx.tax_amount, tx.refunded_subtotal, tx.subtotal);
    const taxThroughThisReturn = prorateMoney(tx.tax_amount, sumMoney([tx.refunded_subtotal, refundSubtotal]), tx.subtotal);
    const taxRemaining = sumMoney([tx.tax_amount, -tx.refunded_tax]);
    return Math.min(Math.max(sumMoney([taxThroughThisReturn, -taxRefundedSoFar]), 0), taxRemaining);
}

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
        total: Money;
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
    const [rejectingReturnId, setRejectingReturnId] = useState<number | null>(null);

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
            const res = await lookupReturnTransaction(query, logout);
            if (res) {
                setFoundTx(res);
                setSelectedItems({});
                setRecentTxResults([]);
            }
        } else {
            const res = await searchReturnTransactions(query, logout);
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
        const res = await lookupReturnTransaction(txId, logout);
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
    const subtotal = sumMoney(selectedItemsArray.map((item) => multiplyMoney(item.unit_price, item.quantity)));
    const estimatedTax = foundTx ? receiptRefundTax(foundTx, subtotal) : 0;
    const totalRefund = sumMoney([subtotal, estimatedTax]);

    const hasExpiredItem = selectedItemsArray.some((item) => item.is_outside_policy);

    useEffect(() => {
        if (hasExpiredItem && refundMethod !== "STORE_CREDIT") {
            setRefundMethod("STORE_CREDIT");
        }
    }, [hasExpiredItem, refundMethod]);

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
        const body = {
            original_transaction_id: foundTx?.transaction_id,
            refund_method: refundMethod,
            notes: returnNotes.trim() ? returnNotes.trim() : undefined,
            items: selectedItemsArray.map((item) => ({
                product_id: item.product_id,
                original_transaction_item_id: item.original_transaction_item_id,
                quantity: item.quantity,
                return_reason: item.return_reason,
                disposition: item.disposition,
            })),
        };

        const res = await createReturn(body, logout);

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
        const res = await getReturnHistory(historyPage, historyStatusFilter, logout);

        if (res) {
            setHistoryList(res.returns || []);
            setHistoryTotal(res.total_length || 0);
        }
        setIsLoadingHistory(false);
    }, [historyPage, historyStatusFilter, logout]);

    const fetchReturnDetail = useCallback(
        async (returnId: number) => {
            setIsLoadingDetail(true);
            const res = await getReturnDetail(returnId, logout);
            if (res) {
                setReturnDetail(res);
            }
            setIsLoadingDetail(false);
        },
        [logout]
    );

    const fetchRtvQueue = useCallback(async () => {
        setIsLoadingRtv(true);
        const res = await getRtvQueue(rtvPage, logout);
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
        const res = await approveReturn(returnId, logout);
        setIsProcessingAction(false);
        if (res) {
            showToast("success", "Return approved successfully");
            fetchReturnDetail(returnId);
            fetchHistory();
        }
    };

    const rejectReturn = async (returnId: number, reason?: string) => {
        setIsProcessingAction(true);
        const res = await rejectReturnRequest(returnId, reason || "Manager rejected", logout);
        setIsProcessingAction(false);
        if (res) {
            showToast("success", "Return rejected");
            fetchReturnDetail(returnId);
            fetchHistory();
        }
    };

    const handleRejectReturn = (returnId: number) => setRejectingReturnId(returnId);

    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Customer Returns & RMA</Text>
                    </View>
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
                <FlatList
                    style={styles.contentContainer}
                    contentContainerStyle={styles.newReturnListContent}
                    data={foundTx?.items ?? []}
                    keyExtractor={(item) => String(item.transaction_item_id)}
                    extraData={selectedItems}
                    ListHeaderComponent={
                        <View style={styles.newReturnHeader}>
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
                                                <Text style={styles.recentTxAmount}>{formatMoney(tx.total_amount)}</Text>
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
                                        <Text style={styles.txSummaryAmount}>{formatMoney(foundTx.total_amount)}</Text>
                                        <Text style={styles.txSummaryMethod}>{foundTx.payment_method}</Text>
                                    </View>
                                </View>
                            )}

                            {foundTx && (
                                <Text style={styles.sectionHeader}>Select Items to Return</Text>
                            )}
                        </View>
                    }
                    renderItem={({ item }) => (
                        <ReturnSaleItemCard
                            item={item}
                            selectedData={selectedItems[item.transaction_item_id]}
                            toggleItemSelection={toggleItemSelection}
                            updateItemQuantity={updateItemQuantity}
                            updateItemReason={updateItemReason}
                            updateItemDisposition={updateItemDisposition}
                        />
                    )}
                    ListFooterComponent={
                        selectedItemsArray.length > 0 ? (
                            <View style={[styles.refundCalculationCard, styles.refundFooter]}>
                                <Text style={styles.sectionHeader}>Refund Summary</Text>

                                <View style={styles.calcRow}>
                                    <Text style={styles.calcLabel}>Subtotal ({selectedItemsArray.length} items):</Text>
                                    <Text style={styles.calcValue}>{formatMoney(subtotal)}</Text>
                                </View>
                                <View style={styles.calcRow}>
                                    <Text style={styles.calcLabel}>Tax (as charged on receipt):</Text>
                                    <Text style={styles.calcValue}>{formatMoney(estimatedTax)}</Text>
                                </View>
                                <View style={[styles.calcRow, styles.calcRowTotal]}>
                                    <Text style={styles.totalRefundLabel}>Total Refund:</Text>
                                    <Text style={styles.totalRefundValue}>{formatMoney(totalRefund)}</Text>
                                </View>

                                {totalRefund > 50 && !isManagerOrAdmin && (
                                    <View style={styles.approvalNotice}>
                                        <Ionicons name="information-circle" size={16} color={COLORS.warning} />
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
                                            Process Return ({formatMoney(totalRefund)})
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        ) : null
                    }
                />
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
                            <LoadingSpinner />
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
                            <LoadingSpinner />
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

            <ReturnSuccessModal submittedReturn={submittedSuccessModal} onClose={() => setSubmittedSuccessModal(null)} />

            <ReturnDetailModal
                selectedReturnId={selectedReturnId}
                setSelectedReturnId={setSelectedReturnId}
                isLoadingDetail={isLoadingDetail}
                returnDetail={returnDetail}
                isManagerOrAdmin={isManagerOrAdmin}
                isProcessingAction={isProcessingAction}
                handleRejectReturn={handleRejectReturn}
                handleApproveReturn={handleApproveReturn}
            />
            <ReturnRejectModal
                returnId={rejectingReturnId}
                isProcessing={isProcessingAction}
                onClose={() => setRejectingReturnId(null)}
                onReject={rejectReturn}
            />
        </TopSafeAreaView>
    );
}
