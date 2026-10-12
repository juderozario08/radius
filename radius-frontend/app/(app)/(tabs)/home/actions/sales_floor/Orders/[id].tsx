import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { globalStyles, SPACING } from "@/constants/styles";
import { orderDetailStyles as styles } from "@/components/orders/orderDetailStyles";
import { COLORS } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { OrderFinancialsModal } from "@/components/orders/OrderFinancialsModal";
import { OrderAssignModal } from "@/components/orders/OrderAssignModal";
import { OrderItemActionModal } from "@/components/orders/OrderItemActionModal";
import { BarcodeScanner, BarcodeScannerRef } from "@/components/common/BarcodeScanner";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import { OnlineOrder, OnlineOrderItem, OrderItemStatus } from "@/types/order.types";
import { assignOnlineOrder, cancelOnlineOrder, completeOnlineOrderPick, getOnlineOrder, updateOnlineOrderItem } from "@/api/onlineOrders.api";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { formatMoney } from "@/utils/money";

type TabType = "SCANNER" | "PRODUCTS";

const CANCEL_ORDER_REASONS = [
    "Customer Requested Cancellation",
    "All Items Unavailable / Out of Stock",
    "Pickup Window Expired (5 Days)",
    "Store Unable to Process Order",
];

const getStatusColor = (status: string) => {
    switch (status) {
        case "READY FOR PICKUP":
        case "READY_FOR_PICKUP":
            return { bg: COLORS.warningBg, text: COLORS.warning };
        case "AWAITING PICKUP":
        case "WAITING FOR CUSTOMER PICKUP":
            return { bg: COLORS.pendingBg, text: COLORS.pending };
        case "RELEASED":
        case "DELIVERED":
        case "COMPLETED":
            return { bg: COLORS.activeBg, text: COLORS.success };
        case "WORK IN PROGRESS":
            return { bg: COLORS.infoBg, text: COLORS.info };
        case "SHIPPED":
            return { bg: COLORS.purpleBg, text: COLORS.purple };
        case "DELIVERING":
            return { bg: COLORS.cyanBg, text: COLORS.cyan };
        case "CANCELLED":
            return { bg: COLORS.inactiveBg, text: COLORS.primary };
        default:
            return { bg: COLORS.surface, text: COLORS.textSecondary };
    }
};

export default function OnlineOrderDetail() {
    const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
    const { user, logout } = useAuth();

    const scannerRef = useRef<BarcodeScannerRef>(null);

    const [order, setOrder] = useState<OnlineOrder | null>(null);
    const [items, setItems] = useState<OnlineOrderItem[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>("PRODUCTS");

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [manualBarcode, setManualBarcode] = useState("");
    const [scanBanner, setScanBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [scannedItem, setScannedItem] = useState<{
        item: OnlineOrderItem;
        tempPickedQty: number;
    } | null>(null);

    const [isOrderMenuVisible, setIsOrderMenuVisible] = useState(false);
    const [isCancelOrderModalVisible, setIsCancelOrderModalVisible] = useState(false);
    const [selectedCancelOrderReason, setSelectedCancelOrderReason] = useState(CANCEL_ORDER_REASONS[0]);

    const [isFinancialsModalVisible, setIsFinancialsModalVisible] = useState(false);

    const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
    const [selectedItemForAction, setSelectedItemForAction] = useState<OnlineOrderItem | null>(null);
    const [itemActionType, setItemActionType] = useState<"MENU" | "CANCEL" | "REMOVE" | "INVALID_QTY" | null>(null);
    const [selectedItemReason, setSelectedItemReason] = useState<string>("");
    const [tempInvalidQty, setTempInvalidQty] = useState<number>(0);

    const fetchOrderDetails = useCallback(async () => {
        if (!id || typeof id !== "string") return;
        setIsLoading(true);
        setError(null);

        const data = await getOnlineOrder(id, logout);

        if (data && data.online_order) {
            setOrder(data.online_order);
            setItems(data.items || []);

            if (!data.online_order.assigned_to && user?.employee_id && user?.role !== "ADMIN") {
                assignOnlineOrder(data.online_order.order_id, user.employee_id, logout).then((res) => {
                    if (res && res.online_order) {
                        setOrder(res.online_order);
                    }
                });
            }
        } else {
            setError("Could not load order details. Please try again.");
        }
        setIsLoading(false);
    }, [id, logout, user?.employee_id, user?.role]);

    useEffect(() => {
        void fetchOrderDetails();
    }, [fetchOrderDetails]);

    const handleBarcodeLookup = (barcode: string) => {
        if (isSaving) return;
        const cleaned = barcode.trim().toUpperCase();
        if (!cleaned) return;

        const matchedItem = items.find((it) => {
            const skuMatch = it.product_sku && it.product_sku.toUpperCase() === cleaned;
            const idMatch = it.product_id.toString() === cleaned;
            return skuMatch || idMatch;
        });

        if (!matchedItem) {
            scannerRef.current?.triggerError();
            setScanBanner({
                type: "error",
                message: "Not part of this order",
            });
            setTimeout(() => setScanBanner(null), 4000);
            return;
        }

        scannerRef.current?.triggerSuccess();
        setScanBanner({
            type: "success",
            message: `Product Found: ${matchedItem.product_sku || "Item #" + matchedItem.product_id}`,
        });
        setTimeout(() => setScanBanner(null), 4000);

        setScannedItem({
            item: matchedItem,
            tempPickedQty: matchedItem.picked_qty < matchedItem.quantity ? matchedItem.picked_qty + 1 : matchedItem.picked_qty,
        });
        setManualBarcode("");
    };

    const handleSaveScannedQuantity = async () => {
        if (!scannedItem || !order) return;
        setIsSaving(true);
        const updated = await updateOnlineOrderItem(order.order_id, scannedItem.item.order_item_id, scannedItem.tempPickedQty, "ACTIVE", logout);
        if (updated === null) {
            setIsSaving(false);
            return;
        }

        setItems((prev) =>
            prev.map((i) =>
                i.order_item_id === scannedItem.item.order_item_id
                    ? { ...i, picked_qty: scannedItem.tempPickedQty, status: "ACTIVE" }
                    : i
            )
        );

        setScannedItem(null);
        scannerRef.current?.resetScanner();
        setIsSaving(false);
    };

    const handleItemExceptionSubmit = async (status: OrderItemStatus, reason: string, pickedQty?: number) => {
        if (!selectedItemForAction || !order) return;
        setIsSaving(true);
        const finalPickedQty = pickedQty !== undefined ? pickedQty : selectedItemForAction.picked_qty;
        const updated = await updateOnlineOrderItem(order.order_id, selectedItemForAction.order_item_id, finalPickedQty, status, logout, reason || null);
        if (updated === null) {
            setIsSaving(false);
            return;
        }

        setItems((prev) =>
            prev.map((i) =>
                i.order_item_id === selectedItemForAction.order_item_id
                    ? { ...i, status: status, reason: reason || null, picked_qty: finalPickedQty }
                    : i
            )
        );

        setItemActionType(null);
        setSelectedItemForAction(null);
        setIsSaving(false);
    };

    const handleConfirmOrderPickedUp = async () => {
        if (!order) return;
        setIsSaving(true);
        const res = await completeOnlineOrderPick(order.order_id, logout);
        if (res === null) {
            setIsSaving(false);
            return;
        }

        if (res.online_order) {
            setOrder(res.online_order);
        } else {
            setOrder((prev) => prev ? { ...prev, status: "AWAITING PICKUP" } : prev);
        }

        Alert.alert("Success", "Order picking confirmed! Status updated to waiting for customer pickup.");
        setIsSaving(false);
    };

    const handleCancelOrderSubmit = async () => {
        if (!order) return;
        setIsSaving(true);
        const res = await cancelOnlineOrder(order.order_id, selectedCancelOrderReason, logout);
        if (res === null) {
            setIsSaving(false);
            return;
        }

        if (res.online_order) {
            setOrder(res.online_order);
        } else {
            setOrder((prev) => prev ? { ...prev, status: "CANCELLED", cancellation_reason: selectedCancelOrderReason } : prev);
        }

        setIsCancelOrderModalVisible(false);
        Alert.alert("Order Cancelled", `Order #${order.order_id} has been cancelled.`);
        setIsSaving(false);
    };

    if (isLoading) {
        return (
            <TopSafeAreaView>
                <HeaderComponent
                    headerLeft={<BackButton fallbackUrl={from} />}
                    headerCenter={<Text style={globalStyles.headerTitle}>Loading...</Text>}
                />
                <View style={globalStyles.container}>
                    <LoadingSpinner style={globalStyles.centerElement} />
                </View>
            </TopSafeAreaView>
        );
    }

    if (error || !order) {
        return (
            <TopSafeAreaView>
                <HeaderComponent
                    headerLeft={<BackButton fallbackUrl={from} />}
                    headerCenter={<Text style={globalStyles.headerTitle}>Error</Text>}
                />
                <View style={globalStyles.container}>
                    <Text style={globalStyles.errorText}>{error || "Order not found."}</Text>
                </View>
            </TopSafeAreaView>
        );
    }

    const isAssignedToOther = order.assigned_to && order.assigned_to !== user?.employee_id;
    const isManagerOrAdmin = user?.role === "MANAGER" || user?.role === "ADMIN";

    const isAllPicked =
        items.length > 0 &&
        items.every((it) => {
            if (it.status === "CANCELLED" || it.status === "REMOVED") return true;
            return it.picked_qty >= it.quantity;
        });

    const isOrderAlreadyProcessed =
        order.status === "AWAITING PICKUP" ||
        order.status === "WAITING FOR CUSTOMER PICKUP" ||
        order.status === "RELEASED" ||
        order.status === "DELIVERED" ||
        order.status === "CANCELLED";

    const canConfirmPick = isAllPicked && !isOrderAlreadyProcessed;

    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerLeft={<BackButton fallbackUrl={from} />}
                headerCenter={<Text style={globalStyles.headerTitle}>Order #{order.order_id}</Text>}
                headerRight={
                    <TouchableOpacity
                        style={styles.headerMenuBtn}
                        onPress={() => setIsOrderMenuVisible(true)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="ellipsis-vertical" size={22} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                }
            />

            <View style={globalStyles.container}>
                {isAssignedToOther && !isManagerOrAdmin && (
                    <View style={styles.warningBanner}>
                        <Ionicons name="alert-circle" size={18} color={COLORS.dangerDark} />
                        <Text style={styles.warningBannerText}>
                            Notice: Worked on by {order.assigned_to_name || "another associate"}.
                        </Text>
                    </View>
                )}

                <View style={styles.customerInfoCard}>
                    <View style={styles.customerHeaderRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.customerName}>{order.customer_name || "Customer"}</Text>
                            <Text style={styles.customerContact}>{order.customer_email}</Text>
                            {order.customer_phone && <Text style={styles.customerContact}>{order.customer_phone}</Text>}
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status).bg }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(order.status).text }]}>
                                {order.status}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.metaRow}>
                        <Text style={styles.metaBadge}>{order.order_type}</Text>
                        <Text style={styles.metaText}>Store #{order.store_id}</Text>
                        <Text style={styles.metaText}>Placed: {new Date(order.placed_at).toLocaleDateString()}</Text>
                    </View>

                    <View style={styles.assigneeRow}>
                        <View style={styles.assigneeInfo}>
                            <Ionicons name="person-outline" size={16} color={COLORS.textSecondary} />
                            <Text style={styles.assigneeText}>
                                Assigned to:{" "}
                                <Text style={{ fontWeight: "700", color: COLORS.textPrimary }}>
                                    {order.assigned_to_name || "Unassigned"}
                                </Text>
                            </Text>
                        </View>

                        {isManagerOrAdmin && (
                            <TouchableOpacity
                                style={styles.reassignBtn}
                                activeOpacity={0.7}
                                onPress={() => setIsAssignModalVisible(true)}
                            >
                                <Ionicons name="swap-horizontal" size={14} color={COLORS.primary} />
                                <Text style={styles.reassignBtnText}>
                                    {order.assigned_to ? "Reassign" : "Assign"}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {order.status === "CANCELLED" && order.cancellation_reason && (
                        <View style={styles.cancellationBanner}>
                            <Ionicons name="close-circle-outline" size={16} color={COLORS.primary} />
                            <Text style={styles.cancellationText}>
                                Cancellation Reason: {order.cancellation_reason}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === "SCANNER" && styles.tabActive]}
                        onPress={() => {
                            setScannedItem(null);
                            setActiveTab("SCANNER");
                        }}
                    >
                        <Ionicons
                            name="barcode-outline"
                            size={18}
                            color={activeTab === "SCANNER" ? COLORS.primary : COLORS.textSecondary}
                            style={{ marginRight: SPACING.xsm }}
                        />
                        <Text style={[styles.tabText, activeTab === "SCANNER" && styles.tabTextActive]}>
                            Scanner
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === "PRODUCTS" && styles.tabActive]}
                        onPress={() => setActiveTab("PRODUCTS")}
                    >
                        <Ionicons
                            name="cube-outline"
                            size={18}
                            color={activeTab === "PRODUCTS" ? COLORS.primary : COLORS.textSecondary}
                            style={{ marginRight: SPACING.xsm }}
                        />
                        <Text style={[styles.tabText, activeTab === "PRODUCTS" && styles.tabTextActive]}>
                            Products ({items.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {scanBanner && (
                    <View
                        style={[
                            styles.bannerContainer,
                            scanBanner.type === "error" ? styles.bannerError : styles.bannerSuccess,
                        ]}
                    >
                        <Ionicons
                            name={scanBanner.type === "error" ? "alert-circle" : "checkmark-circle"}
                            size={18}
                            color={scanBanner.type === "error" ? COLORS.primary : COLORS.success}
                        />
                        <Text
                            style={[
                                styles.bannerText,
                                scanBanner.type === "error" ? styles.bannerTextError : styles.bannerTextSuccess,
                            ]}
                        >
                            {scanBanner.message}
                        </Text>
                    </View>
                )}

                {activeTab === "SCANNER" ? (
                    <View style={styles.scannerTabContent}>
                        <BarcodeScanner
                            ref={scannerRef}
                            height={220}
                            isActive={activeTab === "SCANNER"}
                            onBarcodeScanned={(barcode) => handleBarcodeLookup(barcode)}
                        />

                        <View style={styles.manualEntrySection}>
                            <Text style={styles.manualEntryLabel}>Manual Barcode / SKU Entry</Text>
                            <View style={styles.manualInputRow}>
                                <TextInput
                                    style={[globalStyles.textInput, styles.manualInput]}
                                    placeholder="Enter SKU or barcode number..."
                                    placeholderTextColor={COLORS.placeholder}
                                    value={manualBarcode}
                                    onChangeText={setManualBarcode}
                                    onSubmitEditing={() => handleBarcodeLookup(manualBarcode)}
                                    returnKeyType="done"
                                />
                                <TouchableOpacity
                                    style={[
                                        styles.manualAddBtn,
                                        (!manualBarcode.trim() || isSaving) && { opacity: 0.6 },
                                    ]}
                                    disabled={!manualBarcode.trim() || isSaving}
                                    onPress={() => handleBarcodeLookup(manualBarcode)}
                                >
                                    <Text style={styles.manualAddBtnText}>Lookup</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {scannedItem ? (
                            <View style={styles.scannedCardPopup}>
                                <View style={styles.scannedCardHeader}>
                                    <TouchableOpacity
                                        style={{ flex: 1 }}
                                        activeOpacity={0.7}
                                        onPress={() => {
                                            if (scannedItem.item.product_id) {
                                                router.push(`/(app)/product/${scannedItem.item.product_id}`);
                                            }
                                        }}
                                    >
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xsm }}>
                                            <Text style={styles.scannedCardTitle}>
                                                SKU: {scannedItem.item.product_sku || "N/A"}
                                            </Text>
                                            <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                                        </View>
                                        <Text style={styles.scannedCardSub}>
                                            Price: {formatMoney(scannedItem.item.unit_price)} | Ordered: {scannedItem.item.quantity}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setScannedItem(null);
                                            scannerRef.current?.resetScanner();
                                        }}
                                    >
                                        <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.stepperSection}>
                                    <Text style={styles.stepperLabel}>Picked Quantity:</Text>
                                    <View style={styles.stepperControls}>
                                        <TouchableOpacity
                                            style={styles.stepperBtn}
                                            onPress={() =>
                                                setScannedItem((prev) =>
                                                    prev
                                                        ? { ...prev, tempPickedQty: Math.max(0, prev.tempPickedQty - 1) }
                                                        : null
                                                )
                                            }
                                        >
                                            <Ionicons name="remove" size={20} color={COLORS.textPrimary} />
                                        </TouchableOpacity>

                                        <Text style={styles.stepperValue}>{scannedItem.tempPickedQty}</Text>

                                        <TouchableOpacity
                                            style={styles.stepperBtn}
                                            onPress={() =>
                                                setScannedItem((prev) =>
                                                    prev
                                                        ? {
                                                              ...prev,
                                                              tempPickedQty: Math.min(
                                                                  prev.item.quantity,
                                                                  prev.tempPickedQty + 1
                                                              ),
                                                          }
                                                        : null
                                                )
                                            }
                                        >
                                            <Ionicons name="add" size={20} color={COLORS.textPrimary} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[globalStyles.buttonPrimary, { marginTop: SPACING.md }]}
                                    disabled={isSaving}
                                    onPress={handleSaveScannedQuantity}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator size="small" color={COLORS.surface} />
                                    ) : (
                                        <Text style={globalStyles.buttonTextPrimary}>Update Picked Quantity</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.emptyScannerArea}>
                                <Ionicons name="scan-outline" size={40} color={COLORS.inactiveTint} />
                                <Text style={styles.emptyScannerText}>
                                    Scan an item from this order to verify and update picked quantity.
                                </Text>
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={{ flex: 1 }}>
                        <FlatList
                            data={items}
                            keyExtractor={(item) => item.order_item_id.toString()}
                            contentContainerStyle={styles.productsList}
                            renderItem={({ item }) => {
                                const isItemCancelled = item.status === "CANCELLED";
                                const isItemRemoved = item.status === "REMOVED";
                                const isItemComplete = !isItemCancelled && !isItemRemoved && item.picked_qty >= item.quantity;

                                return (
                                    <View
                                        style={[
                                            styles.productCard,
                                            (isItemCancelled || isItemRemoved) && styles.productCardDimmed,
                                            isItemComplete && styles.productCardComplete,
                                        ]}
                                    >
                                        <View style={styles.productCardHeader}>
                                            <TouchableOpacity
                                                style={{ flex: 1 }}
                                                activeOpacity={0.7}
                                                onPress={() => {
                                                    if (item.product_id) {
                                                        router.push(`/(app)/product/${item.product_id}`);
                                                    }
                                                }}
                                            >
                                                <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
                                                    <Text style={styles.productSku}>SKU: {item.product_sku || "N/A"}</Text>
                                                    <Ionicons name="chevron-forward" size={14} color={COLORS.textSecondary} />
                                                    {item.status && item.status !== "ACTIVE" && (
                                                        <View
                                                            style={[
                                                                styles.itemStatusBadge,
                                                                {
                                                                    backgroundColor:
                                                                        item.status === "CANCELLED" ? COLORS.inactiveBg : COLORS.warningBg,
                                                                },
                                                            ]}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.itemStatusText,
                                                                    {
                                                                        color:
                                                                            item.status === "CANCELLED"
                                                                                ? COLORS.primary
                                                                                : COLORS.warning,
                                                                    },
                                                                ]}
                                                            >
                                                                {item.status}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text style={styles.productPrice}>
                                                    {formatMoney(item.unit_price)} each
                                                </Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.itemActionBtn}
                                                onPress={() => {
                                                    setSelectedItemForAction(item);
                                                    setItemActionType("MENU");
                                                }}
                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            >
                                                <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textPrimary} />
                                            </TouchableOpacity>
                                        </View>

                                        <TouchableOpacity
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                if (item.product_id) {
                                                    router.push(`/(app)/product/${item.product_id}`);
                                                }
                                            }}
                                        >
                                            <View style={styles.progressRow}>
                                                <Text style={styles.progressLabel}>
                                                    Picked: {item.picked_qty} / {item.quantity}
                                                </Text>
                                                <View style={styles.progressBarBg}>
                                                    <View
                                                        style={[
                                                            styles.progressBarFill,
                                                            {
                                                                width: `${Math.min(
                                                                    100,
                                                                    (item.picked_qty / Math.max(1, item.quantity)) * 100
                                                                )}%`,
                                                                backgroundColor:
                                                                    item.picked_qty >= item.quantity
                                                                        ? COLORS.success
                                                                        : COLORS.primary,
                                                            },
                                                        ]}
                                                    />
                                                </View>
                                            </View>

                                            {item.reason && (
                                                <View style={styles.itemReasonRow}>
                                                    <Ionicons name="information-circle-outline" size={14} color={COLORS.textSecondary} />
                                                    <Text style={styles.itemReasonText}>Note: {item.reason}</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                );
                            }}
                            ListEmptyComponent={<Text style={globalStyles.emptyText}>No items found in this order.</Text>}
                        />

                        <View style={styles.bottomBarContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.confirmButton,
                                    canConfirmPick ? styles.confirmButtonActive : styles.confirmButtonDisabled,
                                ]}
                                disabled={!canConfirmPick || isSaving}
                                onPress={handleConfirmOrderPickedUp}
                                activeOpacity={0.85}
                            >
                                {isSaving ? (
                                    <ActivityIndicator size="small" color={COLORS.surface} />
                                ) : (
                                    <Text
                                        style={[
                                            styles.confirmButtonText,
                                            canConfirmPick ? styles.confirmButtonTextActive : styles.confirmButtonTextDisabled,
                                        ]}
                                    >
                                        {isOrderAlreadyProcessed
                                            ? `Order Status: ${order.status}`
                                            : "Confirm Order Picked Up"}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            <Modal
                visible={isOrderMenuVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsOrderMenuVisible(false)}
            >
                <TouchableOpacity
                    style={globalStyles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setIsOrderMenuVisible(false)}
                >
                    <View style={[globalStyles.modalContentWrapper, { maxWidth: 360 }]}>
                        <View style={styles.modalBody}>
                            <Text style={styles.modalTitle}>Order Actions</Text>
                            <View style={globalStyles.divider} />

                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    setIsOrderMenuVisible(false);
                                    setIsFinancialsModalVisible(true);
                                }}
                            >
                                <Ionicons name="receipt-outline" size={20} color={COLORS.textPrimary} />
                                <Text style={styles.menuItemText}>View Financials & Shipping</Text>
                            </TouchableOpacity>

                            {isManagerOrAdmin && (
                                <TouchableOpacity
                                    style={styles.menuItem}
                                    onPress={() => {
                                        setIsOrderMenuVisible(false);
                                        setIsAssignModalVisible(true);
                                    }}
                                >
                                    <Ionicons name="swap-horizontal" size={20} color={COLORS.textPrimary} />
                                    <Text style={styles.menuItemText}>
                                        {order.assigned_to ? "Reassign Order" : "Assign Order"}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {order.status !== "CANCELLED" && (
                                <TouchableOpacity
                                    style={styles.menuItem}
                                    onPress={() => {
                                        setIsOrderMenuVisible(false);
                                        setSelectedCancelOrderReason(CANCEL_ORDER_REASONS[0]);
                                        setIsCancelOrderModalVisible(true);
                                    }}
                                >
                                    <Ionicons name="close-circle-outline" size={20} color={COLORS.primary} />
                                    <Text style={[styles.menuItemText, { color: COLORS.primary }]}>Cancel Entire Order</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[styles.menuItem, { borderBottomWidth: 0, marginTop: SPACING.sm }]}
                                onPress={() => setIsOrderMenuVisible(false)}
                            >
                                <Text style={[styles.menuItemText, { color: COLORS.textSecondary, textAlign: "center", width: "100%" }]}>
                                    Dismiss
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal
                visible={isCancelOrderModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsCancelOrderModalVisible(false)}
            >
                <View style={globalStyles.modalOverlay}>
                    <View style={[globalStyles.modalContentWrapper, { maxWidth: 400 }]}>
                        <View style={styles.modalBody}>
                            <Text style={styles.modalTitle}>Cancel Order #{order.order_id}</Text>
                            <Text style={styles.modalSubtitle}>Please select a cancellation reason:</Text>

                            <ScrollView style={{ maxHeight: 240 }}>
                                {CANCEL_ORDER_REASONS.map((r) => (
                                    <TouchableOpacity
                                        key={r}
                                        style={[
                                            styles.radioRow,
                                            selectedCancelOrderReason === r && styles.radioRowSelected,
                                        ]}
                                        onPress={() => setSelectedCancelOrderReason(r)}
                                    >
                                        <Ionicons
                                            name={selectedCancelOrderReason === r ? "radio-button-on" : "radio-button-off"}
                                            size={20}
                                            color={selectedCancelOrderReason === r ? COLORS.primary : COLORS.textSecondary}
                                        />
                                        <Text
                                            style={[
                                                styles.radioLabel,
                                                selectedCancelOrderReason === r && styles.radioLabelSelected,
                                            ]}
                                        >
                                            {r}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <View style={styles.modalBtnRow}>
                                <TouchableOpacity
                                    style={[globalStyles.buttonSecondary, { flex: 1 }]}
                                    onPress={() => setIsCancelOrderModalVisible(false)}
                                >
                                    <Text style={globalStyles.buttonTextSecondary}>Keep Order</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[globalStyles.buttonPrimary, { flex: 1, backgroundColor: COLORS.primary }]}
                                    onPress={handleCancelOrderSubmit}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator size="small" color={COLORS.surface} />
                                    ) : (
                                        <Text style={globalStyles.buttonTextPrimary}>Cancel Order</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            <OrderFinancialsModal order={order} visible={isFinancialsModalVisible} onClose={() => setIsFinancialsModalVisible(false)} />

            <OrderItemActionModal
                selectedItemForAction={selectedItemForAction}
                setSelectedItemForAction={setSelectedItemForAction}
                itemActionType={itemActionType}
                setItemActionType={setItemActionType}
                selectedItemReason={selectedItemReason}
                setSelectedItemReason={setSelectedItemReason}
                tempInvalidQty={tempInvalidQty}
                setTempInvalidQty={setTempInvalidQty}
                isSaving={isSaving}
                handleItemExceptionSubmit={handleItemExceptionSubmit}
            />

            <OrderAssignModal
                visible={isAssignModalVisible}
                order={order}
                role={user?.role}
                logout={logout}
                onClose={() => setIsAssignModalVisible(false)}
                onAssigned={(employeeId, name) => setOrder((previous) => previous ? { ...previous, assigned_to: employeeId, assigned_to_name: name } : previous)}
            />
        </TopSafeAreaView>
    );
}
