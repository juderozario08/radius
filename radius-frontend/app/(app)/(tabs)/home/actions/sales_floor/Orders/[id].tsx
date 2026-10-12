import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { ENDPOINTS } from "@/constants/routes";
import { globalStyles, SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { DetailRow } from "@/components/common/DetailRow";
import { BarcodeScanner, BarcodeScannerRef } from "@/components/common/BarcodeScanner";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { Employee, GetAllEmployeeResponse } from "@/types/admin.types";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { formatMoney } from "@/utils/money";

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
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
    const [isAssigning, setIsAssigning] = useState(false);

    const [selectedItemForAction, setSelectedItemForAction] = useState<OnlineOrderItem | null>(null);
    const [itemActionType, setItemActionType] = useState<"MENU" | "CANCEL" | "REMOVE" | "INVALID_QTY" | null>(null);
    const [selectedItemReason, setSelectedItemReason] = useState<string>("");
    const [tempInvalidQty, setTempInvalidQty] = useState<number>(0);

    const openAssignModal = async () => {
        setIsAssignModalVisible(true);
        setSelectedEmployeeId(order?.assigned_to || null);
        setIsLoadingEmployees(true);
        const storeParam = order?.store_id ? `&store_id=${order.store_id}` : "";
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

    const handleAssignOrder = async () => {
        if (!selectedEmployeeId || !order) {
            Alert.alert("Validation", "Please select an employee to assign this order to.");
            return;
        }
        setIsAssigning(true);
        const res = await callApi<{ message?: string; online_order?: OnlineOrder; assigned_to?: number; assigned_to_name?: string }>(
            ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.assign(order.order_id),
            {
                method: "PUT",
                body: JSON.stringify({
                    employee_id: selectedEmployeeId,
                }),
            },
            logout
        );
        if (res) {
            const selectedEmp = employees.find((e) => e.employee_id === selectedEmployeeId);
            const assigneeName = res.assigned_to_name || (selectedEmp ? `${selectedEmp.first_name} ${selectedEmp.last_name}` : "Associate");
            setOrder((prev) =>
                prev
                    ? {
                          ...prev,
                          assigned_to: selectedEmployeeId,
                          assigned_to_name: assigneeName,
                      }
                    : prev
            );
            setIsAssignModalVisible(false);
            Alert.alert("Success", `Order #${order.order_id} assigned to ${assigneeName}.`);
        }
        setIsAssigning(false);
    };

    const fetchOrderDetails = useCallback(async () => {
        if (!id || typeof id !== "string") return;
        setIsLoading(true);
        setError(null);

        const endpoint = ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.get(id);
        const data = await callApi<GetOnlineOrderByIDResponse>(endpoint, { method: "GET" }, logout);

        if (data && data.online_order) {
            setOrder(data.online_order);
            setItems(data.items || []);

            if (!data.online_order.assigned_to && user?.employee_id && user?.role !== "ADMIN") {
                callApi<{ online_order: OnlineOrder }>(
                    ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.assign(data.online_order.order_id),
                    {
                        method: "PUT",
                        body: JSON.stringify({
                            employee_id: user.employee_id,
                        }),
                    },
                    logout
                ).then((res) => {
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
        const updated = await callApi(
            ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.updateItem(order.order_id, scannedItem.item.order_item_id),
            {
                method: "PUT",
                body: JSON.stringify({
                    picked_qty: scannedItem.tempPickedQty,
                    status: "ACTIVE",
                }),
            },
            logout
        );
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
        const updated = await callApi(
            ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.updateItem(order.order_id, selectedItemForAction.order_item_id),
            {
                method: "PUT",
                body: JSON.stringify({
                    picked_qty: finalPickedQty,
                    status: status,
                    reason: reason || null,
                }),
            },
            logout
        );
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
        const res = await callApi<{ online_order: OnlineOrder }>(
            ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.completePick(order.order_id),
            { method: "POST" },
            logout
        );
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
        const res = await callApi<{ online_order: OnlineOrder }>(
            ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.cancel(order.order_id),
            {
                method: "POST",
                body: JSON.stringify({
                    reason: selectedCancelOrderReason,
                }),
            },
            logout
        );
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
                                onPress={openAssignModal}
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
                                        openAssignModal();
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
                                    <View style={{ marginBottom: SPACING.lg }}>
                                        <Text style={styles.detailSectionTitle}>Shipping</Text>
                                        <DetailRow label="Address:" value={order.shipping_address} />
                                        <DetailRow label="Carrier:" value={order.carrier || "Standard"} />
                                        <DetailRow label="Tracking:" value={order.tracking_number || "N/A"} />
                                    </View>
                                ) : null}

                                <Text style={styles.detailSectionTitle}>Financials</Text>
                                <DetailRow label="Subtotal:" value={formatMoney(order.subtotal)} />
                                <DetailRow label="Tax:" value={formatMoney(order.tax_amount)} />
                                <DetailRow label="Shipping Fee:" value={formatMoney(order.shipping_fee)} />
                                <DetailRow label="Discount:" value={formatMoney(order.discount_total)} />
                                <View style={globalStyles.divider} />
                                <DetailRow label="Total Amount:" value={formatMoney(order.total_amount)} />
                            </ScrollView>

                            <TouchableOpacity
                                style={[globalStyles.buttonSecondary, { marginTop: SPACING.lg }]}
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
                                        <TouchableOpacity
                                            style={styles.menuItem}
                                            onPress={() => {
                                                const prodId = selectedItemForAction.product_id;
                                                setItemActionType(null);
                                                setSelectedItemForAction(null);
                                                if (prodId) {
                                                    router.push(`/(app)/product/${prodId}`);
                                                }
                                            }}
                                        >
                                            <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
                                            <View style={{ marginLeft: SPACING.sm }}>
                                                <Text style={[styles.menuItemText, { color: COLORS.primary }]}>View Product Details</Text>
                                                <Text style={styles.menuItemSubText}>Check inventory, locations, or pricing</Text>
                                            </View>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.menuItem}
                                            onPress={() => {
                                                setSelectedItemReason(CANCEL_ITEM_REASONS[0]);
                                                setItemActionType("CANCEL");
                                            }}
                                        >
                                            <Ionicons name="close-circle-outline" size={20} color={COLORS.primary} />
                                            <View style={{ marginLeft: SPACING.sm }}>
                                                <Text style={[styles.menuItemText, { color: COLORS.primary }]}>Cancel Item</Text>
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
                                            <Ionicons name="trash-outline" size={20} color={COLORS.warning} />
                                            <View style={{ marginLeft: SPACING.sm }}>
                                                <Text style={[styles.menuItemText, { color: COLORS.warning }]}>Remove Item from Order</Text>
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
                                            <View style={{ marginLeft: SPACING.sm }}>
                                                <Text style={[styles.menuItemText, { color: COLORS.accent }]}>Invalid Quantity</Text>
                                                <Text style={styles.menuItemSubText}>Ordered more than available stock</Text>
                                            </View>
                                        </TouchableOpacity>

                                        {(selectedItemForAction.status === "CANCELLED" || selectedItemForAction.status === "REMOVED") && (
                                            <TouchableOpacity
                                                style={styles.menuItem}
                                                onPress={() => handleItemExceptionSubmit("ACTIVE", "", 0)}
                                            >
                                                <Ionicons name="refresh-outline" size={20} color={COLORS.success} />
                                                <View style={{ marginLeft: SPACING.sm }}>
                                                    <Text style={[styles.menuItemText, { color: COLORS.success }]}>Restore Item to Active</Text>
                                                    <Text style={styles.menuItemSubText}>Undo item cancellation</Text>
                                                </View>
                                            </TouchableOpacity>
                                        )}

                                        <TouchableOpacity
                                            style={[styles.menuItem, { borderBottomWidth: 0, marginTop: SPACING.sm }]}
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
                                                style={[globalStyles.buttonPrimary, { flex: 1, backgroundColor: COLORS.primary }]}
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
                                                style={[globalStyles.buttonPrimary, { flex: 1, backgroundColor: COLORS.warning }]}
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

                                        <Text style={[styles.modalSubtitle, { marginTop: SPACING.md }]}>Reason:</Text>
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

            <Modal
                visible={isAssignModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsAssignModalVisible(false)}
            >
                <View style={globalStyles.modalOverlay}>
                    <View style={[globalStyles.modalContentWrapper, { maxHeight: "80%" }]}>
                        <View style={globalStyles.modalCardContainer}>
                            <View style={globalStyles.modalHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={globalStyles.modalTitle}>
                                        {order.assigned_to ? "Reassign Order" : "Assign Order"}
                                    </Text>
                                    <Text style={globalStyles.modalSubtitle}>
                                        Assign this order to a store associate
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setIsAssignModalVisible(false)}>
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
                                                        {emp.role} • Store #{emp.store_id}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    }}
                                    ListEmptyComponent={
                                        <View style={{ paddingVertical: SPACING.xl, alignItems: "center" }}>
                                            <Text style={globalStyles.emptyText}>No available employees in this store</Text>
                                        </View>
                                    }
                                />
                            )}

                            <View style={styles.modalBtnRow}>
                                <TouchableOpacity
                                    style={[globalStyles.buttonSecondary, { flex: 1 }]}
                                    onPress={() => setIsAssignModalVisible(false)}
                                >
                                    <Text style={globalStyles.buttonTextSecondary}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        globalStyles.buttonPrimary,
                                        { flex: 1 },
                                        (!selectedEmployeeId || isAssigning) && { opacity: 0.6 },
                                    ]}
                                    disabled={!selectedEmployeeId || isAssigning}
                                    onPress={handleAssignOrder}
                                >
                                    {isAssigning ? (
                                        <ActivityIndicator size="small" color={COLORS.surface} />
                                    ) : (
                                        <Text style={globalStyles.buttonTextPrimary}>
                                            {order.assigned_to ? "Reassign" : "Assign"}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </TopSafeAreaView>
    );
}

const styles = StyleSheet.create({
    headerMenuBtn: {
        padding: SPACING.xsm,
    },
    customerInfoCard: {
        backgroundColor: COLORS.surface,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    customerHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    customerName: {
        fontSize: FONT_SIZE.xl,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginBottom: SPACING.xxs,
    },
    customerContact: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textSecondary,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.smd,
        marginTop: SPACING.sm,
    },
    metaBadge: {
        fontSize: FONT_SIZE.sm,
        fontWeight: "700",
        color: COLORS.accent,
        backgroundColor: COLORS.accentSurface,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xxs,
        borderRadius: RADIUS.sm,
    },
    metaText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
    },
    statusBadge: {
        paddingHorizontal: SPACING.smd,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.lg,
    },
    statusText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: "700",
    },
    warningBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.sm,
        backgroundColor: COLORS.inactiveBg,
        borderWidth: 1,
        borderColor: COLORS.dangerBorderLight,
        borderRadius: RADIUS.md,
        marginHorizontal: SPACING.lg,
        marginTop: SPACING.md,
        padding: SPACING.smd,
    },
    warningBannerText: {
        flex: 1,
        fontSize: FONT_SIZE.smd,
        color: COLORS.dangerDark,
        fontWeight: "600",
    },
    cancellationBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xsm,
        marginTop: SPACING.sm,
        backgroundColor: COLORS.inactiveBg,
        padding: SPACING.xsm,
        borderRadius: RADIUS.sm,
    },
    cancellationText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.primary,
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
        paddingVertical: SPACING.md,
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    tabActive: {
        borderBottomColor: COLORS.primary,
    },
    tabText: {
        fontSize: FONT_SIZE.mdl,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    tabTextActive: {
        color: COLORS.primary,
    },

    bannerContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.sm,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.smd,
    },
    bannerError: {
        backgroundColor: COLORS.inactiveBg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.dangerBorderLight,
    },
    bannerSuccess: {
        backgroundColor: COLORS.activeBg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.successBorderLight,
    },
    bannerText: {
        fontSize: FONT_SIZE.md,
        fontWeight: "600",
    },
    bannerTextError: {
        color: COLORS.primary,
    },
    bannerTextSuccess: {
        color: COLORS.success,
    },

    scannerTabContent: {
        flex: 1,
    },
    manualEntrySection: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.smd,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    manualEntryLabel: {
        fontSize: FONT_SIZE.sm,
        fontWeight: "600",
        color: COLORS.textSecondary,
        marginBottom: SPACING.xsm,
    },
    manualInputRow: {
        flexDirection: "row",
        gap: SPACING.sm,
    },
    manualInput: {
        flex: 1,
        height: 44,
        paddingVertical: 0,
    },
    manualAddBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.lg,
        borderRadius: RADIUS.md,
        justifyContent: "center",
        alignItems: "center",
    },
    manualAddBtnText: {
        color: COLORS.surface,
        fontWeight: "700",
        fontSize: FONT_SIZE.md,
    },

    scannedCardPopup: {
        margin: SPACING.lg,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.primary,
        elevation: 4,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    scannedCardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: SPACING.md,
    },
    scannedCardTitle: {
        fontSize: FONT_SIZE.lg,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    scannedCardSub: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textSecondary,
        marginTop: SPACING.xxs,
    },
    stepperSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: SPACING.xs,
        paddingVertical: SPACING.xsm,
    },
    stepperLabel: {
        fontSize: FONT_SIZE.mdl,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    stepperControls: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.neutralBg,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    stepperBtn: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
    },
    stepperValue: {
        fontSize: FONT_SIZE.lg,
        fontWeight: "700",
        color: COLORS.textPrimary,
        minWidth: 32,
        textAlign: "center",
    },

    emptyScannerArea: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: SPACING.xxl,
    },
    emptyScannerText: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        textAlign: "center",
        marginTop: SPACING.md,
        lineHeight: 20,
    },

    productsList: {
        padding: SPACING.lg,
        gap: SPACING.md,
        paddingBottom: 90,
    },
    productCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.mdl,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 1,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    productCardDimmed: {
        opacity: 0.6,
        backgroundColor: COLORS.surfaceMuted,
    },
    productCardComplete: {
        borderColor: COLORS.successBorderLight,
    },
    productCardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    productSku: {
        fontSize: FONT_SIZE.mdl,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    productPrice: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textSecondary,
        marginTop: SPACING.xxs,
    },
    itemStatusBadge: {
        paddingHorizontal: SPACING.xsm,
        paddingVertical: SPACING.xxs,
        borderRadius: RADIUS.xs,
    },
    itemStatusText: {
        fontSize: FONT_SIZE.xxs,
        fontWeight: "700",
    },
    itemActionBtn: {
        padding: SPACING.xs,
    },
    progressRow: {
        marginTop: SPACING.md,
    },
    progressLabel: {
        fontSize: FONT_SIZE.smd,
        fontWeight: "600",
        color: COLORS.textPrimary,
        marginBottom: SPACING.xsm,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: COLORS.inputBorder,
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
        gap: SPACING.xs,
        marginTop: SPACING.sm,
    },
    itemReasonText: {
        fontSize: FONT_SIZE.sm,
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
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        elevation: 8,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    confirmButton: {
        height: 50,
        borderRadius: RADIUS.md,
        justifyContent: "center",
        alignItems: "center",
    },
    confirmButtonActive: {
        backgroundColor: COLORS.primary,
    },
    confirmButtonDisabled: {
        backgroundColor: COLORS.inputBorder,
    },
    confirmButtonText: {
        fontSize: FONT_SIZE.lg,
        fontWeight: "700",
    },
    confirmButtonTextActive: {
        color: COLORS.surface,
    },
    confirmButtonTextDisabled: {
        color: COLORS.inactiveTint,
    },

    modalBody: {
        padding: SPACING.xl,
    },
    modalHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: SPACING.md,
    },
    modalTitle: {
        fontSize: FONT_SIZE.xl,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    modalSubtitle: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textSecondary,
        marginTop: SPACING.xxs,
        marginBottom: SPACING.md,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    menuItemText: {
        fontSize: FONT_SIZE.mdl,
        fontWeight: "600",
        color: COLORS.textPrimary,
        marginLeft: SPACING.sm,
    },
    menuItemSubText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        marginTop: SPACING.xxs,
    },
    radioRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: SPACING.smd,
        paddingHorizontal: SPACING.sm,
        borderRadius: RADIUS.sm,
        marginVertical: SPACING.xxs,
    },
    radioRowSelected: {
        backgroundColor: COLORS.inactiveBg,
    },
    radioLabel: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textPrimary,
        marginLeft: SPACING.smd,
    },
    radioLabelSelected: {
        fontWeight: "600",
        color: COLORS.primary,
    },
    modalBtnRow: {
        flexDirection: "row",
        gap: SPACING.md,
        marginTop: SPACING.lg,
    },
    detailSectionTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginTop: SPACING.smd,
        marginBottom: SPACING.xsm,
    },
    assigneeRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: SPACING.smd,
        paddingTop: SPACING.smd,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
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
        paddingVertical: SPACING.xsPlus,
        paddingHorizontal: SPACING.smd,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.violetBg,
    },
    reassignBtnText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: "700",
        color: COLORS.primary,
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
