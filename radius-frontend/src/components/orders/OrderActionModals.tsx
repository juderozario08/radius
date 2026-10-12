import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/colors";
import { globalStyles, SPACING } from "@/constants/styles";
import { orderDetailStyles as styles } from "@/components/orders/orderDetailStyles";
import { OnlineOrder } from "@/types/order.types";

export const CANCEL_ORDER_REASONS = [
    "Customer Requested Cancellation",
    "All Items Unavailable / Out of Stock",
    "Pickup Window Expired (5 Days)",
    "Store Unable to Process Order",
];

interface OrderMenuModalProps {
    visible: boolean;
    order: OnlineOrder;
    isManagerOrAdmin: boolean;
    onClose: () => void;
    onFinancials: () => void;
    onAssign: () => void;
    onCancelOrder: () => void;
}

export function OrderMenuModal({ visible, order, isManagerOrAdmin, onClose, onFinancials, onAssign, onCancelOrder }: OrderMenuModalProps) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity style={globalStyles.modalOverlay} activeOpacity={1} onPress={onClose}>
                <View style={[globalStyles.modalContentWrapper, { maxWidth: 360 }]}>
                    <View style={styles.modalBody}>
                        <Text style={styles.modalTitle}>Order Actions</Text>
                        <View style={globalStyles.divider} />
                        <TouchableOpacity style={styles.menuItem} onPress={onFinancials}>
                            <Ionicons name="receipt-outline" size={20} color={COLORS.textPrimary} />
                            <Text style={styles.menuItemText}>View Financials & Shipping</Text>
                        </TouchableOpacity>
                        {isManagerOrAdmin && (
                            <TouchableOpacity style={styles.menuItem} onPress={onAssign}>
                                <Ionicons name="swap-horizontal" size={20} color={COLORS.textPrimary} />
                                <Text style={styles.menuItemText}>{order.assigned_to ? "Reassign Order" : "Assign Order"}</Text>
                            </TouchableOpacity>
                        )}
                        {order.status !== "CANCELLED" && (
                            <TouchableOpacity style={styles.menuItem} onPress={onCancelOrder}>
                                <Ionicons name="close-circle-outline" size={20} color={COLORS.primary} />
                                <Text style={[styles.menuItemText, { color: COLORS.primary }]}>Cancel Entire Order</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0, marginTop: SPACING.sm }]} onPress={onClose}>
                            <Text style={[styles.menuItemText, { color: COLORS.textSecondary, textAlign: "center", width: "100%" }]}>Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

interface OrderCancelModalProps {
    visible: boolean;
    orderId: number;
    isSaving: boolean;
    onClose: () => void;
    onSubmit: (reason: string) => void;
}

export function OrderCancelModal({ visible, orderId, isSaving, onClose, onSubmit }: OrderCancelModalProps) {
    const [reason, setReason] = useState(CANCEL_ORDER_REASONS[0]);

    useEffect(() => {
        if (visible) setReason(CANCEL_ORDER_REASONS[0]);
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={globalStyles.modalOverlay}>
                <View style={[globalStyles.modalContentWrapper, { maxWidth: 400 }]}>
                    <View style={styles.modalBody}>
                        <Text style={styles.modalTitle}>Cancel Order #{orderId}</Text>
                        <Text style={styles.modalSubtitle}>Please select a cancellation reason:</Text>
                        <ScrollView style={{ maxHeight: 240 }}>
                            {CANCEL_ORDER_REASONS.map((option) => (
                                <TouchableOpacity
                                    key={option}
                                    style={[styles.radioRow, reason === option && styles.radioRowSelected]}
                                    onPress={() => setReason(option)}
                                >
                                    <Ionicons name={reason === option ? "radio-button-on" : "radio-button-off"} size={20} color={reason === option ? COLORS.primary : COLORS.textSecondary} />
                                    <Text style={[styles.radioLabel, reason === option && styles.radioLabelSelected]}>{option}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity style={[globalStyles.buttonSecondary, { flex: 1 }]} onPress={onClose}>
                                <Text style={globalStyles.buttonTextSecondary}>Keep Order</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[globalStyles.buttonPrimary, { flex: 1, backgroundColor: COLORS.primary }]}
                                onPress={() => onSubmit(reason)}
                                disabled={isSaving}
                            >
                                {isSaving ? <ActivityIndicator size="small" color={COLORS.surface} /> : <Text style={globalStyles.buttonTextPrimary}>Cancel Order</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
