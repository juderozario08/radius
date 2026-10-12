import { orderDetailStyles as styles } from "@/components/orders/orderDetailStyles";
import { COLORS } from "@/constants/colors";
import { globalStyles, SPACING } from "@/constants/styles";
import { OnlineOrderItem, OrderItemStatus } from "@/types/order.types";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Dispatch, SetStateAction } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";

type ActionType = "MENU" | "CANCEL" | "REMOVE" | "INVALID_QTY" | null;

type Props = {
    selectedItemForAction: OnlineOrderItem | null;
    setSelectedItemForAction: Dispatch<SetStateAction<OnlineOrderItem | null>>;
    itemActionType: ActionType;
    setItemActionType: Dispatch<SetStateAction<ActionType>>;
    selectedItemReason: string;
    setSelectedItemReason: Dispatch<SetStateAction<string>>;
    tempInvalidQty: number;
    setTempInvalidQty: Dispatch<SetStateAction<number>>;
    isSaving: boolean;
    handleItemExceptionSubmit: (status: OrderItemStatus, reason: string, pickedQty?: number) => Promise<void>;
};

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

export function OrderItemActionModal({ selectedItemForAction, setSelectedItemForAction, itemActionType, setItemActionType, selectedItemReason, setSelectedItemReason, tempInvalidQty, setTempInvalidQty, isSaving, handleItemExceptionSubmit }: Props) {
    return (
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
    );
}
