import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
    View,
    Text,
    FlatList,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import HeaderComponent from "@/components/common/HeaderComponent";
import BackButton from "@/components/common/BackButton";
import Pagination from "@/components/common/Pagination";
import { OutboundTransferCard } from "@/components/receiving/OutboundTransferCard";
import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";
import { transferScreenStyles as styles } from "@/components/transfers/transferScreenStyles";
import { TransferDetailModal } from "@/components/transfers/TransferDetailModal";
import { TransferDispatchModal } from "@/components/transfers/TransferDispatchModal";
import { TransferCreateModal, NewItemEntry } from "@/components/transfers/TransferCreateModal";
import { useAuth } from "@/hooks/useAuth";
import { showToast } from "@/utils/helpers";
import { cancelOutboundTransfer, createOutboundTransfer, dispatchOutboundTransfer, getOutboundTransferDetail, getOutboundTransfers, getTransferDestinationStores, searchTransferProducts } from "@/api/transfers.api";
import {
    OutboundTransferSummary,
    OutboundTransferDetailResponse,
    DestinationStore,
} from "@/types/receiving.types";
import { Product } from "@/types/inventory.types";
import { Ionicons } from "@expo/vector-icons";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export default function TransfersScreen() {
    const { logout, user } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    const [transfers, setTransfers] = useState<OutboundTransferSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalLength, setTotalLength] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");

    const [selectedTransferId, setSelectedTransferId] = useState<number | null>(null);
    const [transferDetail, setTransferDetail] = useState<OutboundTransferDetailResponse | null>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

    const [isDispatchModalVisible, setIsDispatchModalVisible] = useState(false);
    const [dispatchTargetId, setDispatchTargetId] = useState<number | null>(null);
    const [carrier, setCarrier] = useState("");
    const [trackingNumber, setTrackingNumber] = useState("");
    const [isDispatching, setIsDispatching] = useState(false);

    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
    const [destinationStores, setDestinationStores] = useState<DestinationStore[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
    const [transferReason, setTransferReason] = useState("");
    const [manualCheck, setManualCheck] = useState(false);
    const [pendingItems, setPendingItems] = useState<NewItemEntry[]>([]);

    const [productSearchQuery, setProductSearchQuery] = useState("");
    const [isSearchingProducts, setIsSearchingProducts] = useState(false);
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [itemQtyText, setItemQtyText] = useState("1");
    const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

    const productSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const productSearchSeq = useRef<number>(0);
    const productSearchAbort = useRef<AbortController | null>(null);

    useEffect(() => {
        return () => {
            if (productSearchTimer.current) clearTimeout(productSearchTimer.current);
            if (productSearchAbort.current) productSearchAbort.current.abort();
        };
    }, []);

    const fetchTransfers = useCallback(async (page: number, size: number) => {
        setIsLoading(true);
        const data = await getOutboundTransfers(page, size, logout);
        if (data) {
            setTransfers(data.transfers || []);
            setTotalLength(data.total_length || 0);
        }
        setIsLoading(false);
    }, [logout]);

    const fetchDestinationStores = useCallback(async () => {
        const data = await getTransferDestinationStores(logout);
        if (data && data.stores) {
            setDestinationStores(data.stores);
        }
    }, [logout]);

    useEffect(() => {
        fetchTransfers(pageNumber, pageSize);
    }, [fetchTransfers, pageNumber, pageSize]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchTransfers(pageNumber, pageSize);
        setIsRefreshing(false);
    };

    const handleOpenDetail = async (transferId: number) => {
        setSelectedTransferId(transferId);
        setIsDetailModalVisible(true);
        setIsDetailLoading(true);
        const data = await getOutboundTransferDetail(transferId, logout);
        if (data) {
            setTransferDetail(data);
        }
        setIsDetailLoading(false);
    };

    const handleOpenDispatchModal = (transferId: number) => {
        setDispatchTargetId(transferId);
        setCarrier("");
        setTrackingNumber("");
        setIsDispatchModalVisible(true);
    };

    const handleConfirmDispatch = async () => {
        if (!dispatchTargetId) return;
        setIsDispatching(true);
        const res = await dispatchOutboundTransfer(
            dispatchTargetId,
            carrier.trim() || null,
            trackingNumber.trim() || null,
            logout
        );

        if (res) {
            showToast("success", res.message);
            setIsDispatchModalVisible(false);
            if (isDetailModalVisible && selectedTransferId === dispatchTargetId) {
                handleOpenDetail(dispatchTargetId);
            }
            fetchTransfers(pageNumber, pageSize);
        }
        setIsDispatching(false);
    };

    const handleCancelTransfer = (transferId: number) => {
        Alert.alert(
            "Cancel Transfer",
            `Are you sure you want to cancel Transfer #${transferId}? Any deducted inventory will be refunded.`,
            [
                { text: "No", style: "cancel" },
                {
                    text: "Yes, Cancel",
                    style: "destructive",
                    onPress: async () => {
                        const res = await cancelOutboundTransfer(transferId, logout);
                        if (res) {
                            showToast("success", res.message);
                            if (isDetailModalVisible) {
                                setIsDetailModalVisible(false);
                            }
                            fetchTransfers(pageNumber, pageSize);
                        }
                    },
                },
            ]
        );
    };

    const handleOpenCreateModal = () => {
        fetchDestinationStores();
        setSelectedStoreId(null);
        setTransferReason("");
        setManualCheck(false);
        setPendingItems([]);
        setProductSearchQuery("");
        setSearchResults([]);
        setSelectedProduct(null);
        setItemQtyText("1");
        setIsCreateModalVisible(true);
    };

    const performProductSearch = async (trimmed: string) => {
        if (productSearchAbort.current) {
            productSearchAbort.current.abort();
        }
        const controller = new AbortController();
        productSearchAbort.current = controller;
        const currentSeq = ++productSearchSeq.current;

        setIsSearchingProducts(true);
        const data = await searchTransferProducts(trimmed, controller.signal, logout);

        if (controller.signal.aborted || currentSeq !== productSearchSeq.current) {
            return;
        }

        if (data && data.products) {
            setSearchResults(data.products);
        }
        setIsSearchingProducts(false);
    };

    const handleSearchProducts = (query: string) => {
        setProductSearchQuery(query);
        const trimmed = query.trim();
        if (trimmed.length < 2) {
            if (productSearchTimer.current) clearTimeout(productSearchTimer.current);
            if (productSearchAbort.current) productSearchAbort.current.abort();
            setSearchResults([]);
            setIsSearchingProducts(false);
            return;
        }

        if (productSearchTimer.current) clearTimeout(productSearchTimer.current);
        productSearchTimer.current = setTimeout(() => {
            performProductSearch(trimmed);
        }, 300);
    };

    const handleSelectProduct = (product: Product) => {
        setSelectedProduct(product);
        setSearchResults([]);
        setProductSearchQuery(`${product.name} (${product.sku})`);
    };

    const handleAddPendingItem = () => {
        if (!selectedProduct) {
            showToast("error", "Please search and select a product first");
            return;
        }
        const qty = parseInt(itemQtyText, 10);
        if (isNaN(qty) || qty <= 0) {
            showToast("error", "Please enter a valid quantity greater than 0");
            return;
        }

        const existingIndex = pendingItems.findIndex((it) => it.product_id === selectedProduct.product_id);
        if (existingIndex >= 0) {
            const updated = [...pendingItems];
            updated[existingIndex].qty_requested += qty;
            setPendingItems(updated);
        } else {
            setPendingItems((prev) => [
                ...prev,
                {
                    product_id: selectedProduct.product_id,
                    sku: selectedProduct.sku,
                    upc: selectedProduct.upc,
                    name: selectedProduct.name,
                    brand: selectedProduct.brand,
                    qty_requested: qty,
                },
            ]);
        }

        setSelectedProduct(null);
        setProductSearchQuery("");
        setItemQtyText("1");
    };

    const handleRemovePendingItem = (productId: number) => {
        setPendingItems((prev) => prev.filter((it) => it.product_id !== productId));
    };

    const handleSubmitCreateTransfer = async () => {
        if (!selectedStoreId) {
            showToast("error", "Please select a destination store");
            return;
        }
        if (!transferReason.trim()) {
            showToast("error", "Please enter a reason for this transfer");
            return;
        }
        if (pendingItems.length === 0) {
            showToast("error", "Please add at least one product to the transfer");
            return;
        }

        setIsSubmittingCreate(true);
        const res = await createOutboundTransfer({
            to_store_id: selectedStoreId,
            transfer_reason: transferReason.trim(),
            manual_check_required: manualCheck,
            items: pendingItems.map((it) => ({
                product_id: it.product_id,
                qty_requested: it.qty_requested,
            })),
        }, logout);

        if (res) {
            showToast("success", res.message || "Transfer created successfully");
            setIsCreateModalVisible(false);
            fetchTransfers(1, pageSize);
            setPageNumber(1);
        }
        setIsSubmittingCreate(false);
    };

    const filteredTransfers = useMemo(() => {
        return transfers.filter((t) => {
            const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
            const matchesSearch =
                !searchQuery ||
                t.transfer_id.toString().includes(searchQuery) ||
                t.to_store_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.transfer_reason && t.transfer_reason.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesStatus && matchesSearch;
        });
    }, [transfers, statusFilter, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(totalLength / pageSize));

    return (
        <TopSafeAreaView style={styles.container}>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={<Text style={globalStyles.headerTitle}>Stock Transfers</Text>}
                headerRight={
                    <TouchableOpacity onPress={handleOpenCreateModal} style={styles.headerAddBtn} activeOpacity={0.7}>
                        <Ionicons name="add" size={26} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                }
            />

            <View style={styles.filterSection}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={18} color={COLORS.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by ID, store, or reason..."
                        placeholderTextColor={COLORS.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery ? (
                        <TouchableOpacity onPress={() => setSearchQuery("")}>
                            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    ) : null}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusTabs}>
                    {["ALL", "PENDING", "IN_TRANSIT", "RECEIVED", "CANCELLED"].map((status) => {
                        const isActive = statusFilter === status;
                        return (
                            <TouchableOpacity
                                key={status}
                                style={[styles.statusTabPill, isActive && styles.statusTabPillActive]}
                                onPress={() => setStatusFilter(status)}
                            >
                                <Text style={[styles.statusTabText, isActive && styles.statusTabTextActive]}>
                                    {status === "ALL" ? "All" : status.replace("_", " ")}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            <View style={styles.listWrapper}>
                {isLoading && transfers.length === 0 ? (
                    <View style={globalStyles.centerElement}>
                        <LoadingSpinner />
                    </View>
                ) : filteredTransfers.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="swap-horizontal" size={48} color={COLORS.textSecondary} />
                        <Text style={styles.emptyTitle}>No Transfers Found</Text>
                        <Text style={styles.emptySubtitle}>
                            {statusFilter !== "ALL" || searchQuery
                                ? "Try changing your status filter or search query."
                                : "Tap '+' to create your first outbound transfer."}
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredTransfers}
                        keyExtractor={(item) => item.transfer_id.toString()}
                        renderItem={({ item }) => (
                            <OutboundTransferCard transfer={item} onPress={handleOpenDetail} />
                        )}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                    />
                )}

                <Pagination
                    currentPage={pageNumber}
                    totalPages={totalPages}
                    onPageChange={setPageNumber}
                    isLoading={isLoading}
                    pageSize={pageSize}
                    pageSizeOptions={[10, 20, 50]}
                    onPageSizeChange={(newSize) => {
                        setPageSize(newSize);
                        setPageNumber(1);
                    }}
                />
            </View>

            <TransferDetailModal
                isDetailModalVisible={isDetailModalVisible}
                setIsDetailModalVisible={setIsDetailModalVisible}
                isDetailLoading={isDetailLoading}
                transferDetail={transferDetail}
                isAdmin={isAdmin}
                handleCancelTransfer={handleCancelTransfer}
                handleOpenDispatchModal={handleOpenDispatchModal}
            />

            <TransferDispatchModal
                isDispatchModalVisible={isDispatchModalVisible}
                setIsDispatchModalVisible={setIsDispatchModalVisible}
                dispatchTargetId={dispatchTargetId}
                carrier={carrier}
                setCarrier={setCarrier}
                trackingNumber={trackingNumber}
                setTrackingNumber={setTrackingNumber}
                isDispatching={isDispatching}
                handleConfirmDispatch={handleConfirmDispatch}
            />

            <TransferCreateModal
                isCreateModalVisible={isCreateModalVisible}
                setIsCreateModalVisible={setIsCreateModalVisible}
                pendingItems={pendingItems}
                destinationStores={destinationStores}
                selectedStoreId={selectedStoreId}
                setSelectedStoreId={setSelectedStoreId}
                transferReason={transferReason}
                setTransferReason={setTransferReason}
                manualCheck={manualCheck}
                setManualCheck={setManualCheck}
                productSearchQuery={productSearchQuery}
                handleSearchProducts={handleSearchProducts}
                isSearchingProducts={isSearchingProducts}
                searchResults={searchResults}
                selectedProduct={selectedProduct}
                handleSelectProduct={handleSelectProduct}
                itemQtyText={itemQtyText}
                setItemQtyText={setItemQtyText}
                handleAddPendingItem={handleAddPendingItem}
                handleRemovePendingItem={handleRemovePendingItem}
                isSubmittingCreate={isSubmittingCreate}
                handleSubmitCreateTransfer={handleSubmitCreateTransfer}
            />
        </TopSafeAreaView>
    );
}
