import React, { useState, useEffect, useCallback, useMemo } from "react";
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
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import HeaderComponent from "@/components/common/HeaderComponent";
import BackButton from "@/components/common/BackButton";
import Pagination from "@/components/common/Pagination";
import { ActionButtonRow } from "@/components/common/ActionButtonRow";
import { DetailRow } from "@/components/common/DetailRow";
import { OutboundTransferCard } from "@/components/receiving/OutboundTransferCard";
import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";
import { ENDPOINTS } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { callApi, showToast } from "@/utils/helpers";
import {
    OutboundTransferSummary,
    OutboundTransferDetailResponse,
    DestinationStore,
    GetAllOutboundTransfersResponse,
} from "@/types/receiving.types";
import { SearchProductsResponse, Product } from "@/types/inventory.types";
import { Ionicons } from "@expo/vector-icons";

interface NewItemEntry {
    product_id: number;
    sku: string;
    upc: string;
    name: string;
    brand: string;
    qty_requested: number;
}

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

    const fetchTransfers = useCallback(async (page: number, size: number) => {
        setIsLoading(true);
        const endpoint = `${ENDPOINTS.SALES_FLOOR.TRANSFERS.getAll}?page_number=${page}&page_size=${size}`;
        const data = await callApi<GetAllOutboundTransfersResponse>(endpoint, { method: "GET" }, logout);
        if (data) {
            setTransfers(data.transfers || []);
            setTotalLength(data.total_length || 0);
        }
        setIsLoading(false);
    }, [logout]);

    const fetchDestinationStores = useCallback(async () => {
        const data = await callApi<{ stores: DestinationStore[] }>(ENDPOINTS.SALES_FLOOR.TRANSFERS.stores, { method: "GET" }, logout);
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
        const endpoint = ENDPOINTS.SALES_FLOOR.TRANSFERS.getDetail(transferId);
        const data = await callApi<OutboundTransferDetailResponse>(endpoint, { method: "GET" }, logout);
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
        const res = await callApi<{ message: string }>(ENDPOINTS.SALES_FLOOR.TRANSFERS.dispatch(dispatchTargetId), {
            method: "POST",
            body: {
                transfer_id: dispatchTargetId,
                carrier: carrier.trim() ? carrier.trim() : null,
                tracking_number: trackingNumber.trim() ? trackingNumber.trim() : null,
            },
        }, logout);

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
                        const res = await callApi<{ message: string }>(ENDPOINTS.SALES_FLOOR.TRANSFERS.cancel(transferId), {
                            method: "POST",
                            body: { transfer_id: transferId },
                        }, logout);
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

    const handleSearchProducts = async (query: string) => {
        setProductSearchQuery(query);
        const trimmed = query.trim();
        if (trimmed.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearchingProducts(true);
        const endpoint = `${ENDPOINTS.SALES_FLOOR.PRODUCTS.search}?query=${encodeURIComponent(trimmed)}&limit=8&offset=0`;
        const data = await callApi<SearchProductsResponse>(endpoint, { method: "GET" }, logout);
        if (data && data.products) {
            setSearchResults(data.products);
        }
        setIsSearchingProducts(false);
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
        const res = await callApi<{ message: string }>(ENDPOINTS.SALES_FLOOR.TRANSFERS.create, {
            method: "POST",
            body: {
                to_store_id: selectedStoreId,
                transfer_reason: transferReason.trim(),
                manual_check_required: manualCheck,
                items: pendingItems.map((it) => ({
                    product_id: it.product_id,
                    qty_requested: it.qty_requested,
                })),
            },
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
                        <ActivityIndicator size="large" color={COLORS.primary} />
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

            <Modal
                visible={isDetailModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsDetailModalVisible(false)}
            >
                <View style={globalStyles.modalOverlay}>
                    <View style={globalStyles.modalContentWrapper}>
                        <View style={[globalStyles.modalCardContainer, styles.detailModalContainer]}>
                            {isDetailLoading || !transferDetail ? (
                                <View style={styles.modalLoading}>
                                    <ActivityIndicator size="large" color={COLORS.primary} />
                                </View>
                            ) : (
                                <>
                                    <View style={globalStyles.modalHeader}>
                                        <View>
                                            <Text style={globalStyles.modalName}>
                                                Transfer #{transferDetail.transfer_id}
                                            </Text>
                                            <Text style={styles.modalSubHeader}>
                                                To: {transferDetail.to_store_name}
                                            </Text>
                                        </View>
                                        <View style={[styles.detailStatusBadge, getBadgeBg(transferDetail.status)]}>
                                            <Text style={[styles.detailStatusText, getBadgeTextColor(transferDetail.status)]}>
                                                {transferDetail.status.replace("_", " ")}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={globalStyles.divider} />

                                    <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
                                        <View style={globalStyles.section}>
                                            <Text style={globalStyles.sectionTitle}>Transfer Info</Text>
                                            {isAdmin && <DetailRow label="Origin Store:" value={transferDetail.from_store_name} />}
                                            <DetailRow label="Destination Store:" value={transferDetail.to_store_name} />
                                            <DetailRow label="Created By:" value={transferDetail.requested_by_name} />
                                            <DetailRow
                                                label="Created At:"
                                                value={new Date(transferDetail.created_at).toLocaleString()}
                                            />
                                            {transferDetail.transfer_reason ? (
                                                <DetailRow label="Reason:" value={transferDetail.transfer_reason} />
                                            ) : null}
                                            <DetailRow
                                                label="Manual Check:"
                                                value={transferDetail.manual_check_required ? "Yes (Itemized Scan)" : "No (Auto-Receive Allowed)"}
                                            />
                                        </View>

                                        {(transferDetail.shipped_at || transferDetail.carrier || transferDetail.tracking_number) && (
                                            <View style={globalStyles.section}>
                                                <Text style={globalStyles.sectionTitle}>Dispatch & Tracking</Text>
                                                {transferDetail.shipped_at && (
                                                    <DetailRow
                                                        label="Dispatched At:"
                                                        value={new Date(transferDetail.shipped_at).toLocaleString()}
                                                    />
                                                )}
                                                {transferDetail.carrier && (
                                                    <DetailRow label="Carrier:" value={transferDetail.carrier} />
                                                )}
                                                {transferDetail.tracking_number && (
                                                    <DetailRow label="Tracking #:" value={transferDetail.tracking_number} />
                                                )}
                                            </View>
                                        )}

                                        <View style={globalStyles.section}>
                                            <Text style={globalStyles.sectionTitle}>
                                                Items ({transferDetail.items.length})
                                            </Text>
                                            {transferDetail.items.map((it) => (
                                                <View key={it.transfer_item_id} style={styles.itemRowCard}>
                                                    <View style={styles.itemRowLeft}>
                                                        <Text style={styles.itemRowName} numberOfLines={1}>{it.name}</Text>
                                                        <Text style={styles.itemRowSku}>SKU: {it.sku} â€¢ UPC: {it.upc}</Text>
                                                    </View>
                                                    <View style={styles.itemRowRight}>
                                                        <Text style={styles.itemRowQtyLabel}>Requested: <Text style={styles.itemRowQtyValue}>{it.qty_requested}</Text></Text>
                                                        {it.qty_sent !== null && (
                                                            <Text style={styles.itemRowQtyLabel}>Sent: <Text style={styles.itemRowQtyValue}>{it.qty_sent}</Text></Text>
                                                        )}
                                                        {it.qty_received !== null && (
                                                            <Text style={styles.itemRowQtyLabel}>Received: <Text style={styles.itemRowQtyValue}>{it.qty_received}</Text></Text>
                                                        )}
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    </ScrollView>

                                    <View style={globalStyles.divider} />

                                    <ActionButtonRow
                                        buttons={[
                                            {
                                                key: "close",
                                                label: "Close",
                                                kind: "neutral",
                                                onPress: () => setIsDetailModalVisible(false),
                                            },
                                            ...(transferDetail.status === "PENDING"
                                                ? [
                                                    {
                                                        key: "cancel",
                                                        label: "Cancel",
                                                        kind: "danger" as const,
                                                        onPress: () => handleCancelTransfer(transferDetail.transfer_id),
                                                    },
                                                    {
                                                        key: "dispatch",
                                                        label: "Dispatch",
                                                        kind: "primary" as const,
                                                        onPress: () => handleOpenDispatchModal(transferDetail.transfer_id),
                                                    },
                                                ]
                                                : []),
                                        ]}
                                    />
                                </>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={isDispatchModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsDispatchModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={globalStyles.modalOverlay}
                >
                    <View style={globalStyles.modalContentWrapper}>
                        <View style={globalStyles.modalCardContainer}>
                            <View style={globalStyles.modalHeader}>
                                <Text style={globalStyles.modalName}>Dispatch Transfer #{dispatchTargetId}</Text>
                            </View>
                            <Text style={styles.dispatchSubtitle}>
                                Dispatched items will be marked as in-transit and ready for destination store receiving.
                            </Text>

                            <View style={globalStyles.divider} />

                            <View style={styles.formField}>
                                <Text style={globalStyles.modalInputLabel}>Carrier (Optional)</Text>
                                <TextInput
                                    style={globalStyles.textInput}
                                    placeholder="e.g. FedEx, Purolator, Internal Van"
                                    placeholderTextColor={COLORS.textSecondary}
                                    value={carrier}
                                    onChangeText={setCarrier}
                                />
                            </View>

                            <View style={styles.formField}>
                                <Text style={globalStyles.modalInputLabel}>Tracking Number (Optional)</Text>
                                <TextInput
                                    style={globalStyles.textInput}
                                    placeholder="e.g. TRK-98437291"
                                    placeholderTextColor={COLORS.textSecondary}
                                    value={trackingNumber}
                                    onChangeText={setTrackingNumber}
                                />
                            </View>

                            <View style={globalStyles.divider} />

                            <ActionButtonRow
                                buttons={[
                                    {
                                        key: "back",
                                        label: "Back",
                                        kind: "neutral",
                                        onPress: () => setIsDispatchModalVisible(false),
                                        disabled: isDispatching,
                                    },
                                    {
                                        key: "dispatch-confirm",
                                        label: isDispatching ? "Dispatching..." : "Confirm Dispatch",
                                        kind: "primary",
                                        onPress: handleConfirmDispatch,
                                        loading: isDispatching,
                                    },
                                ]}
                            />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal
                visible={isCreateModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setIsCreateModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={globalStyles.modalOverlay}
                >
                    <View style={globalStyles.modalContentWrapper}>
                        <View style={[globalStyles.modalCardContainer, styles.createModalCard]}>
                            <View style={globalStyles.modalHeader}>
                                <Text style={globalStyles.modalName}>New Outbound Transfer</Text>
                                <TouchableOpacity onPress={() => setIsCreateModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                                </TouchableOpacity>
                            </View>

                            <View style={globalStyles.divider} />

                            <ScrollView style={styles.createScroll} showsVerticalScrollIndicator={false}>
                                <View style={styles.formField}>
                                    <Text style={globalStyles.modalInputLabel}>Destination Store *</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storeListScroll}>
                                        {destinationStores.map((st) => {
                                            const isSelected = selectedStoreId === st.store_id;
                                            return (
                                                <TouchableOpacity
                                                    key={st.store_id}
                                                    style={[styles.storePill, isSelected && styles.storePillSelected]}
                                                    onPress={() => setSelectedStoreId(st.store_id)}
                                                >
                                                    <Text style={[styles.storePillText, isSelected && styles.storePillTextSelected]}>
                                                        {st.name} ({st.city})
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>

                                <View style={styles.formField}>
                                    <Text style={globalStyles.modalInputLabel}>Transfer Reason *</Text>
                                    <TextInput
                                        style={globalStyles.textInput}
                                        placeholder="e.g. Restock, Customer Request, Stock Rebalance"
                                        placeholderTextColor={COLORS.textSecondary}
                                        value={transferReason}
                                        onChangeText={setTransferReason}
                                    />
                                </View>

                                <TouchableOpacity
                                    style={styles.toggleRow}
                                    onPress={() => setManualCheck(!manualCheck)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={manualCheck ? "checkbox" : "square-outline"}
                                        size={22}
                                        color={COLORS.primary}
                                    />
                                    <View style={styles.toggleTextContainer}>
                                        <Text style={styles.toggleTitle}>Require Itemized Scan on Delivery</Text>
                                        <Text style={styles.toggleSubtext}>
                                            If checked, destination store must scan each item rather than auto-receiving.
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                <View style={globalStyles.divider} />

                                <View style={styles.formField}>
                                    <Text style={globalStyles.modalInputLabel}>Add Products *</Text>
                                    <View style={styles.productSearchRow}>
                                        <TextInput
                                            style={[globalStyles.textInput, styles.productSearchInput]}
                                            placeholder="Search product by name, SKU, UPC..."
                                            placeholderTextColor={COLORS.textSecondary}
                                            value={productSearchQuery}
                                            onChangeText={handleSearchProducts}
                                        />
                                        {isSearchingProducts ? (
                                            <ActivityIndicator size="small" color={COLORS.primary} style={styles.searchSpinner} />
                                        ) : null}
                                    </View>

                                    {searchResults.length > 0 && (
                                        <View style={styles.searchResultsBox}>
                                            {searchResults.map((prod) => (
                                                <TouchableOpacity
                                                    key={prod.product_id}
                                                    style={styles.searchResultItem}
                                                    onPress={() => handleSelectProduct(prod)}
                                                >
                                                    <Text style={styles.searchResultName} numberOfLines={1}>{prod.name}</Text>
                                                    <Text style={styles.searchResultSku}>SKU: {prod.sku} â€¢ Brand: {prod.brand}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}

                                    {selectedProduct && (
                                        <View style={styles.selectedProductBox}>
                                            <View style={styles.selectedProductInfo}>
                                                <Text style={styles.selectedProductName} numberOfLines={1}>{selectedProduct.name}</Text>
                                                <Text style={styles.selectedProductSku}>SKU: {selectedProduct.sku}</Text>
                                            </View>
                                            <View style={styles.qtyAddRow}>
                                                <Text style={styles.qtyLabel}>Qty:</Text>
                                                <TextInput
                                                    style={styles.qtyInput}
                                                    keyboardType="number-pad"
                                                    value={itemQtyText}
                                                    onChangeText={setItemQtyText}
                                                />
                                                <TouchableOpacity style={styles.addBtn} onPress={handleAddPendingItem}>
                                                    <Text style={styles.addBtnText}>Add</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.pendingItemsSection}>
                                    <Text style={styles.pendingItemsTitle}>
                                        Transfer Manifest ({pendingItems.length} {pendingItems.length === 1 ? "item" : "items"})
                                    </Text>
                                    {pendingItems.length === 0 ? (
                                        <Text style={styles.emptyPendingText}>No products added to manifest yet.</Text>
                                    ) : (
                                        pendingItems.map((it) => (
                                            <View key={it.product_id} style={styles.manifestItemRow}>
                                                <View style={styles.manifestItemLeft}>
                                                    <Text style={styles.manifestItemName} numberOfLines={1}>{it.name}</Text>
                                                    <Text style={styles.manifestItemSku}>SKU: {it.sku} â€¢ Qty: {it.qty_requested}</Text>
                                                </View>
                                                <TouchableOpacity onPress={() => handleRemovePendingItem(it.product_id)}>
                                                    <Ionicons name="trash-outline" size={20} color="#C62828" />
                                                </TouchableOpacity>
                                            </View>
                                        ))
                                    )}
                                </View>
                            </ScrollView>

                            <View style={globalStyles.divider} />

                            <ActionButtonRow
                                buttons={[
                                    {
                                        key: "cancel-create",
                                        label: "Cancel",
                                        kind: "neutral",
                                        onPress: () => setIsCreateModalVisible(false),
                                        disabled: isSubmittingCreate,
                                    },
                                    {
                                        key: "submit-create",
                                        label: isSubmittingCreate ? "Creating..." : "Create Transfer",
                                        kind: "primary",
                                        onPress: handleSubmitCreateTransfer,
                                        loading: isSubmittingCreate,
                                        disabled: pendingItems.length === 0 || !selectedStoreId,
                                    },
                                ]}
                            />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </TopSafeAreaView>
    );
}

function getBadgeBg(status: string) {
    switch (status) {
        case "PENDING":
            return { backgroundColor: "#FFF3E0" };
        case "IN_TRANSIT":
            return { backgroundColor: "#E3F2FD" };
        case "RECEIVED":
            return { backgroundColor: "#E8F5E9" };
        case "CANCELLED":
            return { backgroundColor: "#FFEBEE" };
        default:
            return { backgroundColor: COLORS.surface };
    }
}

function getBadgeTextColor(status: string) {
    switch (status) {
        case "PENDING":
            return { color: "#E65100" };
        case "IN_TRANSIT":
            return { color: "#1565C0" };
        case "RECEIVED":
            return { color: "#2E7D32" };
        case "CANCELLED":
            return { color: "#C62828" };
        default:
            return { color: COLORS.textSecondary };
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    headerAddBtn: {
        padding: 4,
    },
    filterSection: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 6,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.background,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: COLORS.textPrimary,
        padding: 0,
    },
    statusTabs: {
        flexDirection: "row",
        gap: 8,
        paddingVertical: 10,
    },
    statusTabPill: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    statusTabPillActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    statusTabText: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    statusTabTextActive: {
        color: "#FFFFFF",
    },
    listWrapper: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    listContent: {
        paddingBottom: 24,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginTop: 12,
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: "center",
        marginTop: 6,
    },
    detailModalContainer: {
        maxHeight: "85%",
    },
    modalLoading: {
        padding: 40,
        alignItems: "center",
    },
    modalSubHeader: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    detailStatusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    detailStatusText: {
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
    },
    detailScroll: {
        maxHeight: 400,
    },
    itemRowCard: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    itemRowLeft: {
        flex: 1,
        marginRight: 8,
    },
    itemRowName: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    itemRowSku: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    itemRowRight: {
        alignItems: "flex-end",
    },
    itemRowQtyLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    itemRowQtyValue: {
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    dispatchSubtitle: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    formField: {
        marginBottom: 14,
    },
    createModalCard: {
        maxHeight: "90%",
    },
    createScroll: {
        maxHeight: 450,
    },
    storeListScroll: {
        flexDirection: "row",
        marginTop: 6,
    },
    storePill: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: 8,
    },
    storePillSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    storePillText: {
        fontSize: 13,
        color: COLORS.textPrimary,
        fontWeight: "500",
    },
    storePillTextSelected: {
        color: "#FFFFFF",
        fontWeight: "600",
    },
    toggleRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 14,
    },
    toggleTextContainer: {
        flex: 1,
    },
    toggleTitle: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    toggleSubtext: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    productSearchRow: {
        position: "relative",
    },
    productSearchInput: {
        paddingRight: 36,
    },
    searchSpinner: {
        position: "absolute",
        right: 12,
        top: 14,
    },
    searchResultsBox: {
        maxHeight: 180,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        backgroundColor: COLORS.surface,
        marginTop: 4,
    },
    searchResultItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    searchResultName: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    searchResultSku: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    selectedProductBox: {
        marginTop: 8,
        padding: 10,
        borderRadius: 8,
        backgroundColor: "#F5F5F5",
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    selectedProductInfo: {
        marginBottom: 8,
    },
    selectedProductName: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    selectedProductSku: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginTop: 1,
    },
    qtyAddRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    qtyLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    qtyInput: {
        width: 60,
        height: 36,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        borderRadius: 6,
        textAlign: "center",
        backgroundColor: COLORS.surface,
        fontSize: 14,
        color: COLORS.textPrimary,
    },
    addBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    addBtnText: {
        color: "#FFFFFF",
        fontWeight: "600",
        fontSize: 13,
    },
    pendingItemsSection: {
        marginTop: 10,
    },
    pendingItemsTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginBottom: 6,
    },
    emptyPendingText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontStyle: "italic",
    },
    manifestItemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    manifestItemLeft: {
        flex: 1,
        marginRight: 8,
    },
    manifestItemName: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    manifestItemSku: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
});
