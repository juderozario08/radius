import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList } from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import Pagination from "@/components/common/Pagination";
import { ReturnCard } from "@/components/returns/ReturnCard";
import { ReturnSaleItemCard, SelectedReturnItem } from "@/components/returns/ReturnSaleItemCard";
import { ReturnSuccessModal } from "@/components/returns/ReturnSuccessModal";
import { ReturnDetailModal } from "@/components/returns/ReturnDetailModal";
import { ReturnRejectModal } from "@/components/returns/ReturnRejectModal";
import { HistoryStatusFilters, LookupMode, RefundSummaryCard, ReturnLookupPanel, ReturnsTab, ReturnsTabBar, RtvQueueCard } from "@/components/returns/ReturnScreenPanels";
import { COLORS } from "@/constants/colors";
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
import { type Money, sumMoney } from "@/utils/money";
import { RETURN_APPROVAL_THRESHOLD, receiptRefundTax, refundSubtotal, selectionFromItem } from "@/utils/returnRefund";

export default function Returns() {
    const { logout, user } = useAuth();
    const isManagerOrAdmin = user?.role === "MANAGER" || user?.role === "ADMIN";

    const [activeTab, setActiveTab] = useState<ReturnsTab>("NEW_RETURN");

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
                next[item.transaction_item_id] = selectionFromItem(item);
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
    const subtotal = refundSubtotal(selectedItemsArray);
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

            <ReturnsTabBar activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === "NEW_RETURN" && (
                <FlatList
                    style={styles.contentContainer}
                    contentContainerStyle={styles.newReturnListContent}
                    data={foundTx?.items ?? []}
                    keyExtractor={(item) => String(item.transaction_item_id)}
                    extraData={selectedItems}
                    ListHeaderComponent={
                        <ReturnLookupPanel
                            mode={lookupMode}
                            onModeChange={setLookupMode}
                            query={lookupInput}
                            onQueryChange={setLookupInput}
                            onSearch={handleSearch}
                            isSearching={isSearchingTx}
                            recentResults={recentTxResults}
                            onSelectTransaction={handleSelectTransactionFromList}
                            transaction={foundTx}
                        />
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
                            <RefundSummaryCard
                                itemCount={selectedItemsArray.length}
                                subtotal={subtotal}
                                tax={estimatedTax}
                                total={totalRefund}
                                needsApproval={totalRefund > RETURN_APPROVAL_THRESHOLD && !isManagerOrAdmin}
                                refundMethod={refundMethod}
                                onRefundMethodChange={setRefundMethod}
                                storeCreditOnly={hasExpiredItem}
                                notes={returnNotes}
                                onNotesChange={setReturnNotes}
                                isSubmitting={isSubmitting}
                                onSubmit={handleSubmitReturn}
                            />
                        ) : null
                    }
                />
            )}

            {activeTab === "HISTORY" && (
                <View style={styles.contentContainer}>
                    <HistoryStatusFilters
                        value={historyStatusFilter}
                        onChange={(status) => {
                            setHistoryStatusFilter(status);
                            setHistoryPage(1);
                        }}
                    />

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
                            renderItem={({ item }) => <ReturnCard returnItem={item} onPress={handleOpenDetail} />}
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
                            renderItem={({ item }) => <RtvQueueCard item={item} />}
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
