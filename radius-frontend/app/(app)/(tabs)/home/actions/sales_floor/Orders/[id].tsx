import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { globalStyles, SPACING } from "@/constants/styles";
import { orderDetailStyles as styles } from "@/components/orders/orderDetailStyles";
import { COLORS } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { OrderFinancialsModal } from "@/components/orders/OrderFinancialsModal";
import { OrderAssignModal } from "@/components/orders/OrderAssignModal";
import { OrderItemActionModal } from "@/components/orders/OrderItemActionModal";
import { OrderProductCard } from "@/components/orders/OrderProductCard";
import { ScannedOrderItemCard } from "@/components/orders/ScannedOrderItemCard";
import { OrderMenuModal, OrderCancelModal } from "@/components/orders/OrderActionModals";
import { BarcodeScanner, BarcodeScannerRef } from "@/components/common/BarcodeScanner";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import { OnlineOrder, OnlineOrderItem, OrderItemStatus } from "@/types/order.types";
import { assignOnlineOrder, cancelOnlineOrder, completeOnlineOrderPick, getOnlineOrder, updateOnlineOrderItem } from "@/api/onlineOrders.api";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

type TabType = "SCANNER" | "PRODUCTS";

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

    const handleCancelOrderSubmit = async (reason: string) => {
        if (!order) return;
        setIsSaving(true);
        const res = await cancelOnlineOrder(order.order_id, reason, logout);
        if (res === null) {
            setIsSaving(false);
            return;
        }

        if (res.online_order) {
            setOrder(res.online_order);
        } else {
            setOrder((prev) => prev ? { ...prev, status: "CANCELLED", cancellation_reason: reason } : prev);
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
                            <ScannedOrderItemCard
                                item={scannedItem.item}
                                pickedQty={scannedItem.tempPickedQty}
                                isSaving={isSaving}
                                onQtyChange={(qty) => setScannedItem((prev) => prev ? { ...prev, tempPickedQty: qty } : null)}
                                onDismiss={() => { setScannedItem(null); scannerRef.current?.resetScanner(); }}
                                onSave={handleSaveScannedQuantity}
                            />
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
                            renderItem={({ item }) => <OrderProductCard item={item} onAction={(selected) => {
                                setSelectedItemForAction(selected);
                                setItemActionType("MENU");
                            }} />}
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

            <OrderMenuModal
                visible={isOrderMenuVisible}
                order={order}
                isManagerOrAdmin={isManagerOrAdmin}
                onClose={() => setIsOrderMenuVisible(false)}
                onFinancials={() => { setIsOrderMenuVisible(false); setIsFinancialsModalVisible(true); }}
                onAssign={() => { setIsOrderMenuVisible(false); setIsAssignModalVisible(true); }}
                onCancelOrder={() => { setIsOrderMenuVisible(false); setIsCancelOrderModalVisible(true); }}
            />
            <OrderCancelModal
                visible={isCancelOrderModalVisible}
                orderId={order.order_id}
                isSaving={isSaving}
                onClose={() => setIsCancelOrderModalVisible(false)}
                onSubmit={handleCancelOrderSubmit}
            />

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
