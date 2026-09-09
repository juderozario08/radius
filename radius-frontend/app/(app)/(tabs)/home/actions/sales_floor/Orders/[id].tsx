import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { ENDPOINTS } from "@/constants/routes";
import { globalStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { DetailRow } from "@/components/common/DetailRow";
import { BarcodeScanner, BarcodeScannerRef } from "@/components/common/BarcodeScanner";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import { callApi } from "@/utils/helpers";
import { GetOnlineOrderByIDResponse, OnlineOrder, OnlineOrderItem, OrderItemStatus } from "@/types/order.types";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type TabType = "SCANNER" | "PRODUCTS";

const CANCEL_ITEM_REASONS = [
    "Out of Stock",
    "Damaged / Defective",
    "Item Cannot Be Located",
    "Store Unable to Fulfill",
];

const REMOVE_ITEM_REASONS = [
    "Customer Requested Removal",
    "Customer Changed Mind",
    "Ordered by Mistake",
];

const INVALID_QTY_REASONS = [
    "Insufficient Stock Available",
    "Remaining Units Damaged / Unavailable",
];

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
            return { bg: "#FFF3E0", text: "#E65100" };
        case "AWAITING PICKUP":
        case "WAITING FOR CUSTOMER PICKUP":
            return { bg: "#FFF8E1", text: "#F57F17" };
        case "RELEASED":
        case "DELIVERED":
        case "COMPLETED":
            return { bg: "#E8F5E9", text: "#2E7D32" };
        case "WORK IN PROGRESS":
            return { bg: "#E3F2FD", text: "#1565C0" };
        case "SHIPPED":
            return { bg: "#F3E5F5", text: "#6A1B9A" };
        case "DELIVERING":
            return { bg: "#E0F7FA", text: "#006064" };
        case "CANCELLED":
            return { bg: "#FFEBEE", text: "#C70202" };
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

    const [selectedItemForAction, setSelectedItemForAction] = useState<OnlineOrderItem | null>(null);
    const [itemActionType, setItemActionType] = useState<"MENU" | "CANCEL" | "REMOVE" | "INVALID_QTY" | null>(null);
    const [selectedItemReason, setSelectedItemReason] = useState<string>("");
    const [tempInvalidQty, setTempInvalidQty] = useState<number>(0);

    useEffect(() => {
        if (id) {
            fetchOrderDetails();
        }
    }, [id]);

    const fetchOrderDetails = async () => {
        setIsLoading(true);
        setError(null);

        const endpoint = `${ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.get}?id=${id}`;
        const data = await callApi<GetOnlineOrderByIDResponse>(endpoint, { method: "GET" }, logout);

        if (data && data.online_order) {
            setOrder(data.online_order);
            setItems(data.items || []);

            // Auto-assign if currently unassigned
            if (!data.online_order.assigned_to && user?.employee_id) {
                callApi<{ online_order: OnlineOrder }>(
                    ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.assign,
                    {
                        method: "PUT",
                        body: JSON.stringify({
                            order_id: data.online_order.order_id,
                            employee_id: user.employee_id,
                        }),
                    },
                    logout
                ).then((res) => {
                    if (res && res.online_order) {
                        setOrder(res.online_order);
                    }
                }).catch(() => {});
            }
        } else {
            setError("Could not load order details. Please try again.");
        }
        setIsLoading(false);
    };

    const handleBarcodeLookup = (barcode: string) => {
        const cleaned = barcode.trim().toUpperCase();
        if (!cleaned) return;

        const matchedItem = items.find((it) => {
            const skuMatch = it.product_sku && it.product_sku.toUpperCase() === cleaned;
            const idMatch = it.product_id.toString() === cleaned;
            return skuMatch || idMatch;
        });

        if (!matchedItem) {
            setScanBanner({
                type: "error",
                message: "Not part of this order",
            });
            setTimeout(() => setScanBanner(null), 4000);
            scannerRef.current?.resetScanner();
            return;
        }

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
        try {
            await callApi(
                ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.updateItem,
                {
                    method: "PUT",
                    body: JSON.stringify({
                        order_id: order.order_id,
                        order_item_id: scannedItem.item.order_item_id,
                        picked_qty: scannedItem.tempPickedQty,
                        status: "ACTIVE",
                    }),
                },
                logout
            );

            setItems((prev) =>
                prev.map((i) =>
                    i.order_item_id === scannedItem.item.order_item_id
                        ? { ...i, picked_qty: scannedItem.tempPickedQty, status: "ACTIVE" }
                        : i
                )
            );

            setScannedItem(null);
            scannerRef.current?.resetScanner();
        } catch (err: any) {
            Alert.alert("Update Error", err.message || "Failed to update item quantity");
        } finally {
            setIsSaving(false);
        }
    };

    const handleItemExceptionSubmit = async (status: OrderItemStatus, reason: string, pickedQty?: number) => {
        if (!selectedItemForAction || !order) return;
        setIsSaving(true);
        try {
            const finalPickedQty = pickedQty !== undefined ? pickedQty : selectedItemForAction.picked_qty;
            await callApi(
                ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.updateItem,
                {
                    method: "PUT",
                    body: JSON.stringify({
                        order_id: order.order_id,
                        order_item_id: selectedItemForAction.order_item_id,
                        picked_qty: finalPickedQty,
                        status: status,
                        reason: reason || null,
                    }),
                },
                logout
            );

            setItems((prev) =>
                prev.map((i) =>
                    i.order_item_id === selectedItemForAction.order_item_id
                        ? { ...i, status: status, reason: reason || null, picked_qty: finalPickedQty }
                        : i
                )
            );

            setItemActionType(null);
            setSelectedItemForAction(null);
        } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to update item exception");
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmOrderPickedUp = async () => {
        if (!order) return;
        setIsSaving(true);
        try {
            const res = await callApi<{ online_order: OnlineOrder }>(
                ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.completePick,
                {
                    method: "POST",
                    body: JSON.stringify({
                        order_id: order.order_id,
                    }),
                },
                logout
            );

            if (res && res.online_order) {
                setOrder(res.online_order);
            } else {
                setOrder((prev) => prev ? { ...prev, status: "AWAITING PICKUP" } : prev);
            }

            Alert.alert("Success", "Order picking confirmed! Status updated to waiting for customer pickup.");
        } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to complete order picking");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelOrderSubmit = async () => {
        if (!order) return;
        setIsSaving(true);
        try {
            const res = await callApi<{ online_order: OnlineOrder }>(
                ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.cancel,
                {
                    method: "POST",
                    body: JSON.stringify({
                        order_id: order.order_id,
                        reason: selectedCancelOrderReason,
                    }),
                },
                logout
            );

            if (res && res.online_order) {
                setOrder(res.online_order);
            } else {
                setOrder((prev) => prev ? { ...prev, status: "CANCELLED", cancellation_reason: selectedCancelOrderReason } : prev);
            }

            setIsCancelOrderModalVisible(false);
            Alert.alert("Order Cancelled", `Order #${order.order_id} has been cancelled.`);
        } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to cancel order");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <TopSafeAreaView>
                <HeaderComponent
                    headerLeft={<BackButton fallbackUrl={from} />}
                    headerCenter={<Text style={globalStyles.headerTitle}>Loading...</Text>}
                />
                <View style={globalStyles.container}>
                    <ActivityIndicator size="large" color={COLORS.primary} style={globalStyles.centerElement} />
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

    // Readiness calculation for "Confirm Order Picked Up" button:
    // Every item must either be CANCELLED, REMOVED, or fully picked (picked_qty >= quantity).
    const activeItems = items.filter((i) => i.status !== "CANCELLED" && i.status !== "REMOVED");
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
                        <Ionicons name="alert-circle" size={18} color="#C62828" />
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

                    {order.status === "CANCELLED" && order.cancellation_reason && (
                        <View style={styles.cancellationBanner}>
                            <Ionicons name="close-circle-outline" size={16} color="#C70202" />
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
                            style={{ marginRight: 6 }}
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
                            style={{ marginRight: 6 }}
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
                            color={scanBanner.type === "error" ? "#C70202" : "#2E7D32"}
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
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.scannedCardTitle}>
                                            SKU: {scannedItem.item.product_sku || "N/A"}
                                        </Text>
                                        <Text style={styles.scannedCardSub}>
                                            Price: ${(scannedItem.item.unit_price || 0).toFixed(2)} | Ordered: {scannedItem.item.quantity}
                                        </Text>
                                    </View>
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
                                    style={[globalStyles.buttonPrimary, { marginTop: 12 }]}
                                    disabled={isSaving}
                                    onPress={handleSaveScannedQuantity}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator size="small" color="#FFF" />
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
                                            <View style={{ flex: 1 }}>
                                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                                    <Text style={styles.productSku}>SKU: {item.product_sku || "N/A"}</Text>
                                                    {item.status && item.status !== "ACTIVE" && (
                                                        <View
                                                            style={[
                                                                styles.itemStatusBadge,
                                                                {
                                                                    backgroundColor:
                                                                        item.status === "CANCELLED" ? "#FFEBEE" : "#FFF3E0",
                                                                },
                                                            ]}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.itemStatusText,
                                                                    {
                                                                        color:
                                                                            item.status === "CANCELLED"
                                                                                ? "#C70202"
                                                                                : "#E65100",
                                                                    },
                                                                ]}
                                                            >
                                                                {item.status}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text style={styles.productPrice}>
                                                    ${(item.unit_price || 0).toFixed(2)} each
                                                </Text>
                                            </View>

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
                                                                    ? "#2E7D32"
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
                                    <ActivityIndicator size="small" color="#FFF" />
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

                            {order.status !== "CANCELLED" && (
                                <TouchableOpacity
                                    style={styles.menuItem}
                                    onPress={() => {
                                        setIsOrderMenuVisible(false);
                                        setSelectedCancelOrderReason(CANCEL_ORDER_REASONS[0]);
                                        setIsCancelOrderModalVisible(true);
                                    }}
                                >
                                    <Ionicons name="close-circle-outline" size={20} color="#C70202" />
                                    <Text style={[styles.menuItemText, { color: "#C70202" }]}>Cancel Entire Order</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[styles.menuItem, { borderBottomWidth: 0, marginTop: 8 }]}
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
                                    style={[globalStyles.buttonPrimary, { flex: 1, backgroundColor: "#C70202" }]}
                                    onPress={handleCancelOrderSubmit}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                        <Text style={globalStyles.buttonTextPrimary}>Cancel Order</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={isFinancialsModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsFinancialsModalVisible(false)}
            >
                <View style={globalStyles.modalOverlay}>
                    <View style={[globalStyles.modalContentWrapper, { maxHeight: "80%" }]}>
                        <View style={styles.modalBody}>
                            <View style={styles.modalHeaderRow}>
                                <Text style={styles.modalTitle}>Order Breakdown</Text>
                                <TouchableOpacity onPress={() => setIsFinancialsModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                {order.shipping_address ? (
                                    <View style={{ marginBottom: 16 }}>
                                        <Text style={styles.detailSectionTitle}>Shipping</Text>
                                        <DetailRow label="Address:" value={order.shipping_address} />
                                        <DetailRow label="Carrier:" value={order.carrier || "Standard"} />
                                        <DetailRow label="Tracking:" value={order.tracking_number || "N/A"} />
                                    </View>
                                ) : null}

                                <Text style={styles.detailSectionTitle}>Financials</Text>
                                <DetailRow label="Subtotal:" value={`$${(order.subtotal || 0).toFixed(2)}`} />
                                <DetailRow label="Tax:" value={`$${(order.tax_amount || 0).toFixed(2)}`} />
                                <DetailRow label="Shipping Fee:" value={`$${(order.shipping_fee || 0).toFixed(2)}`} />
                                <DetailRow label="Discount:" value={`$${(order.discount_total || 0).toFixed(2)}`} />
                                <View style={globalStyles.divider} />
                                <DetailRow label="Total Amount:" value={`$${(order.total_amount || 0).toFixed(2)}`} />
                            </ScrollView>

                            <TouchableOpacity
                                style={[globalStyles.buttonSecondary, { marginTop: 16 }]}
                                onPress={() => setIsFinancialsModalVisible(false)}
                            >
                                <Text style={globalStyles.buttonTextSecondary}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={itemActionType !== null}
                transparent={true}
                animationType="fade"
                onRequestClose={() => {
                    setItemActionType(null);
                    setSelectedItemForAction(null);
                }}
            >
                <View style={globalStyles.modalOverlay}>
                    <View style={[globalStyles.modalContentWrapper, { maxWidth: 380 }]}>
                        {selectedItemForAction && (
                            <View style={styles.modalBody}>
                                {itemActionType === "MENU" && (
                                    <>
                                        <Text style={styles.modalTitle}>Item Actions</Text>
                                        <Text style={styles.modalSubtitle}>
                                            SKU: {selectedItemForAction.product_sku || "Item #" + selectedItemForAction.product_id}
                                        </Text>
                                        <View style={globalStyles.divider} />

                                        <TouchableOpacity
                                            style={styles.menuItem}
                                            onPress={() => {
                                                setSelectedItemReason(CANCEL_ITEM_REASONS[0]);
                                                setItemActionType("CANCEL");
                                            }}
                                        >
                                            <Ionicons name="close-circle-outline" size={20} color="#C70202" />
                                            <View style={{ marginLeft: 8 }}>
                                                <Text style={[styles.menuItemText, { color: "#C70202" }]}>Cancel Item</Text>
                                                <Text style={styles.menuItemSubText}>Store out of stock or damaged</Text>
                                            </View>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.menuItem}
                                            onPress={() => {
                                                setSelectedItemReason(REMOVE_ITEM_REASONS[0]);
                                                setItemActionType("REMOVE");
                                            }}
                                        >
                                            <Ionicons name="trash-outline" size={20} color="#E65100" />
                                            <View style={{ marginLeft: 8 }}>
                                                <Text style={[styles.menuItemText, { color: "#E65100" }]}>Remove Item from Order</Text>
                                                <Text style={styles.menuItemSubText}>Customer requested removal</Text>
                                            </View>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.menuItem}
                                            onPress={() => {
                                                setSelectedItemReason(INVALID_QTY_REASONS[0]);
                                                setTempInvalidQty(Math.max(0, selectedItemForAction.picked_qty));
                                                setItemActionType("INVALID_QTY");
                                            }}
                                        >
                                            <Ionicons name="alert-circle-outline" size={20} color={COLORS.accent} />
                                            <View style={{ marginLeft: 8 }}>
                                                <Text style={[styles.menuItemText, { color: COLORS.accent }]}>Invalid Quantity</Text>
                                                <Text style={styles.menuItemSubText}>Ordered more than available stock</Text>
                                            </View>
                                        </TouchableOpacity>

                                        {(selectedItemForAction.status === "CANCELLED" || selectedItemForAction.status === "REMOVED") && (
                                            <TouchableOpacity
                                                style={styles.menuItem}
                                                onPress={() => handleItemExceptionSubmit("ACTIVE", "", 0)}
                                            >
                                                <Ionicons name="refresh-outline" size={20} color="#2E7D32" />
                                                <View style={{ marginLeft: 8 }}>
                                                    <Text style={[styles.menuItemText, { color: "#2E7D32" }]}>Restore Item to Active</Text>
                                                    <Text style={styles.menuItemSubText}>Undo item cancellation</Text>
                                                </View>
                                            </TouchableOpacity>
                                        )}

                                        <TouchableOpacity
                                            style={[styles.menuItem, { borderBottomWidth: 0, marginTop: 8 }]}
                                            onPress={() => {
                                                setItemActionType(null);
                                                setSelectedItemForAction(null);
                                            }}
                                        >
                                            <Text style={[styles.menuItemText, { color: COLORS.textSecondary, textAlign: "center", width: "100%" }]}>
                                                Cancel
                                            </Text>
                                        </TouchableOpacity>
                                    </>
                                )}

                                {itemActionType === "CANCEL" && (
                                    <>
                                        <Text style={styles.modalTitle}>Cancel Item</Text>
                                        <Text style={styles.modalSubtitle}>Select reason for cancelling item:</Text>

                                        {CANCEL_ITEM_REASONS.map((r) => (
                                            <TouchableOpacity
                                                key={r}
                                                style={[styles.radioRow, selectedItemReason === r && styles.radioRowSelected]}
                                                onPress={() => setSelectedItemReason(r)}
                                            >
                                                <Ionicons
                                                    name={selectedItemReason === r ? "radio-button-on" : "radio-button-off"}
                                                    size={20}
                                                    color={selectedItemReason === r ? COLORS.primary : COLORS.textSecondary}
                                                />
                                                <Text style={[styles.radioLabel, selectedItemReason === r && styles.radioLabelSelected]}>
                                                    {r}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}

                                        <View style={styles.modalBtnRow}>
                                            <TouchableOpacity
                                                style={[globalStyles.buttonSecondary, { flex: 1 }]}
                                                onPress={() => setItemActionType("MENU")}
                                            >
                                                <Text style={globalStyles.buttonTextSecondary}>Back</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[globalStyles.buttonPrimary, { flex: 1, backgroundColor: "#C70202" }]}
                                                onPress={() => handleItemExceptionSubmit("CANCELLED", selectedItemReason, 0)}
                                                disabled={isSaving}
                                            >
                                                <Text style={globalStyles.buttonTextPrimary}>Confirm</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                )}

                                {itemActionType === "REMOVE" && (
                                    <>
                                        <Text style={styles.modalTitle}>Remove Item</Text>
                                        <Text style={styles.modalSubtitle}>Select reason for removing item:</Text>

                                        {REMOVE_ITEM_REASONS.map((r) => (
                                            <TouchableOpacity
                                                key={r}
                                                style={[styles.radioRow, selectedItemReason === r && styles.radioRowSelected]}
                                                onPress={() => setSelectedItemReason(r)}
                                            >
                                                <Ionicons
                                                    name={selectedItemReason === r ? "radio-button-on" : "radio-button-off"}
                                                    size={20}
                                                    color={selectedItemReason === r ? COLORS.primary : COLORS.textSecondary}
                                                />
                                                <Text style={[styles.radioLabel, selectedItemReason === r && styles.radioLabelSelected]}>
                                                    {r}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}

                                        <View style={styles.modalBtnRow}>
                                            <TouchableOpacity
                                                style={[globalStyles.buttonSecondary, { flex: 1 }]}
                                                onPress={() => setItemActionType("MENU")}
                                            >
                                                <Text style={globalStyles.buttonTextSecondary}>Back</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[globalStyles.buttonPrimary, { flex: 1, backgroundColor: "#E65100" }]}
                                                onPress={() => handleItemExceptionSubmit("REMOVED", selectedItemReason, 0)}
                                                disabled={isSaving}
                                            >
                                                <Text style={globalStyles.buttonTextPrimary}>Remove</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                )}

                                {itemActionType === "INVALID_QTY" && (
                                    <>
                                        <Text style={styles.modalTitle}>Invalid Quantity</Text>
                                        <Text style={styles.modalSubtitle}>
                                            Ordered: {selectedItemForAction.quantity} | Set available stock:
                                        </Text>

                                        <View style={styles.stepperSection}>
                                            <Text style={styles.stepperLabel}>Available Units:</Text>
                                            <View style={styles.stepperControls}>
                                                <TouchableOpacity
                                                    style={styles.stepperBtn}
                                                    onPress={() => setTempInvalidQty((q) => Math.max(0, q - 1))}
                                                >
                                                    <Ionicons name="remove" size={20} color={COLORS.textPrimary} />
                                                </TouchableOpacity>
                                                <Text style={styles.stepperValue}>{tempInvalidQty}</Text>
                                                <TouchableOpacity
                                                    style={styles.stepperBtn}
                                                    onPress={() =>
                                                        setTempInvalidQty((q) =>
                                                            Math.min(selectedItemForAction.quantity, q + 1)
                                                        )
                                                    }
                                                >
                                                    <Ionicons name="add" size={20} color={COLORS.textPrimary} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        <Text style={[styles.modalSubtitle, { marginTop: 12 }]}>Reason:</Text>
                                        {INVALID_QTY_REASONS.map((r) => (
                                            <TouchableOpacity
                                                key={r}
                                                style={[styles.radioRow, selectedItemReason === r && styles.radioRowSelected]}
                                                onPress={() => setSelectedItemReason(r)}
                                            >
                                                <Ionicons
                                                    name={selectedItemReason === r ? "radio-button-on" : "radio-button-off"}
                                                    size={20}
                                                    color={selectedItemReason === r ? COLORS.primary : COLORS.textSecondary}
                                                />
                                                <Text style={[styles.radioLabel, selectedItemReason === r && styles.radioLabelSelected]}>
                                                    {r}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}

                                        <View style={styles.modalBtnRow}>
                                            <TouchableOpacity
                                                style={[globalStyles.buttonSecondary, { flex: 1 }]}
                                                onPress={() => setItemActionType("MENU")}
                                            >
                                                <Text style={globalStyles.buttonTextSecondary}>Back</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[globalStyles.buttonPrimary, { flex: 1 }]}
                                                onPress={() => handleItemExceptionSubmit("ACTIVE", selectedItemReason, tempInvalidQty)}
                                                disabled={isSaving}
                                            >
                                                <Text style={globalStyles.buttonTextPrimary}>Save</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                )}
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </TopSafeAreaView>
    );
}

const styles = StyleSheet.create({
    headerMenuBtn: {
        padding: 6,
    },
    customerInfoCard: {
        backgroundColor: COLORS.surface,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    customerHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    customerName: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    customerContact: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginTop: 8,
    },
    metaBadge: {
        fontSize: 12,
        fontWeight: "700",
        color: COLORS.accent,
        backgroundColor: "#EBF3FA",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    metaText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "700",
    },
    warningBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#FFEBEE",
        borderWidth: 1,
        borderColor: "#FFCDD2",
        borderRadius: 8,
        marginHorizontal: 16,
        marginTop: 12,
        padding: 10,
    },
    warningBannerText: {
        flex: 1,
        fontSize: 13,
        color: "#C62828",
        fontWeight: "600",
    },
    cancellationBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 8,
        backgroundColor: "#FFEBEE",
        padding: 6,
        borderRadius: 6,
    },
    cancellationText: {
        fontSize: 12,
        color: "#C70202",
        fontWeight: "600",
    },

    tabContainer: {
        flexDirection: "row",
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    tabActive: {
        borderBottomColor: COLORS.primary,
    },
    tabText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    tabTextActive: {
        color: COLORS.primary,
    },

    bannerContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    bannerError: {
        backgroundColor: "#FFEBEE",
        borderBottomWidth: 1,
        borderBottomColor: "#FFCDD2",
    },
    bannerSuccess: {
        backgroundColor: "#E8F5E9",
        borderBottomWidth: 1,
        borderBottomColor: "#C8E6C9",
    },
    bannerText: {
        fontSize: 14,
        fontWeight: "600",
    },
    bannerTextError: {
        color: "#C70202",
    },
    bannerTextSuccess: {
        color: "#2E7D32",
    },

    scannerTabContent: {
        flex: 1,
    },
    manualEntrySection: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    manualEntryLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.textSecondary,
        marginBottom: 6,
    },
    manualInputRow: {
        flexDirection: "row",
        gap: 8,
    },
    manualInput: {
        flex: 1,
        height: 44,
        paddingVertical: 0,
    },
    manualAddBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    manualAddBtnText: {
        color: "#FFF",
        fontWeight: "700",
        fontSize: 14,
    },

    scannedCardPopup: {
        margin: 16,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.primary,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    scannedCardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    scannedCardTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    scannedCardSub: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    stepperSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 4,
        paddingVertical: 6,
    },
    stepperLabel: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    stepperControls: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.neutralBg,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    stepperBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    stepperValue: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textPrimary,
        minWidth: 32,
        textAlign: "center",
    },

    emptyScannerArea: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    emptyScannerText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: "center",
        marginTop: 12,
        lineHeight: 20,
    },

    productsList: {
        padding: 16,
        gap: 12,
        paddingBottom: 90,
    },
    productCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    productCardDimmed: {
        opacity: 0.6,
        backgroundColor: "#FAFAFA",
    },
    productCardComplete: {
        borderColor: "#C8E6C9",
    },
    productCardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    productSku: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    productPrice: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    itemStatusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    itemStatusText: {
        fontSize: 10,
        fontWeight: "700",
    },
    itemActionBtn: {
        padding: 4,
    },
    progressRow: {
        marginTop: 12,
    },
    progressLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textPrimary,
        marginBottom: 6,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: "#E0E0E0",
        borderRadius: 3,
        overflow: "hidden",
    },
    progressBarFill: {
        height: 6,
        borderRadius: 3,
    },
    itemReasonRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 8,
    },
    itemReasonText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontStyle: "italic",
    },

    bottomBarContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingHorizontal: 16,
        paddingVertical: 12,
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    confirmButton: {
        height: 50,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    confirmButtonActive: {
        backgroundColor: COLORS.primary,
    },
    confirmButtonDisabled: {
        backgroundColor: "#E0E0E0",
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: "700",
    },
    confirmButtonTextActive: {
        color: "#FFFFFF",
    },
    confirmButtonTextDisabled: {
        color: "#8E8E8E",
    },

    modalBody: {
        padding: 20,
    },
    modalHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    modalSubtitle: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
        marginBottom: 12,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    menuItemText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.textPrimary,
        marginLeft: 8,
    },
    menuItemSubText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    radioRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 6,
        marginVertical: 2,
    },
    radioRowSelected: {
        backgroundColor: "#FFEBEE",
    },
    radioLabel: {
        fontSize: 14,
        color: COLORS.textPrimary,
        marginLeft: 10,
    },
    radioLabelSelected: {
        fontWeight: "600",
        color: COLORS.primary,
    },
    modalBtnRow: {
        flexDirection: "row",
        gap: 12,
        marginTop: 16,
    },
    detailSectionTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginTop: 10,
        marginBottom: 6,
    },
});
