import { returnScreenStyles as styles } from "@/components/returns/returnScreenStyles";
import { COLORS } from "@/constants/colors";
import { OriginalTransactionItemForReturn, ReturnDisposition, ReturnReason } from "@/types/returns.types";
import { Money, formatMoney } from "@/utils/money";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export interface SelectedReturnItem {
    original_transaction_item_id?: number;
    product_id: number;
    product_name: string;
    product_sku: string;
    unit_price: Money;
    quantity: number;
    max_returnable: number;
    return_reason: ReturnReason;
    disposition: ReturnDisposition;
    is_outside_policy: boolean;
}

const RETURN_REASONS: ReturnReason[] = [
    "DEFECTIVE",
    "WRONG_ITEM",
    "CHANGED_MIND",
    "DAMAGED_IN_BOX",
    "MISSING_PARTS",
    "WARRANTY_CLAIM",
    "OTHER",
];

const DISPOSITIONS: { key: ReturnDisposition; label: string }[] = [
    { key: "RESTOCK", label: "Restock (New)" },
    { key: "OPEN_BOX", label: "Open Box" },
    { key: "DEFECTIVE_RTV", label: "Defective (RTV)" },
    { key: "DAMAGED_WRITE_OFF", label: "Damaged (Write Off)" },
    { key: "QUARANTINE", label: "Quarantine" },
];

type Props = {
    item: OriginalTransactionItemForReturn;
    selectedData?: SelectedReturnItem;
    toggleItemSelection: (item: OriginalTransactionItemForReturn) => void;
    updateItemQuantity: (id: number, delta: number) => void;
    updateItemReason: (id: number, reason: ReturnReason) => void;
    updateItemDisposition: (id: number, disposition: ReturnDisposition) => void;
};

export function ReturnSaleItemCard({ item, selectedData, toggleItemSelection, updateItemQuantity, updateItemReason, updateItemDisposition }: Props) {
    const isSelected = !!selectedData;
    const canReturn = item.is_returnable && item.returnable_qty > 0;
    return (
                            <View
                                style={[
                                    styles.saleItemCard,
                                    isSelected && styles.saleItemCardSelected,
                                    !canReturn && styles.saleItemCardDisabled,
                                ]}
                            >
                                <TouchableOpacity
                                    style={styles.itemHeaderRow}
                                    onPress={() => toggleItemSelection(item)}
                                    disabled={!canReturn}
                                >
                                    <Ionicons
                                        name={
                                            isSelected
                                                ? "checkbox"
                                                : canReturn
                                                    ? "square-outline"
                                                    : "close-circle-outline"
                                        }
                                        size={22}
                                        color={
                                            isSelected
                                                ? COLORS.primary
                                                : canReturn
                                                    ? COLORS.textSecondary
                                                    : COLORS.inactiveTint
                                        }
                                    />
                                    <View style={styles.itemInfo}>
                                        <Text style={styles.itemName}>{item.product_name}</Text>
                                        <Text style={styles.itemMeta}>
                                            SKU: {item.product_sku} • {formatMoney(item.unit_price)} ea
                                        </Text>
                                    </View>
                                    <View style={styles.itemQtyBadge}>
                                        <Text style={styles.itemQtyBadgeText}>
                                            {item.returnable_qty} of {item.purchased_qty} left
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                <View style={styles.policyRow}>
                                    <Ionicons
                                        name={item.is_outside_policy_window ? "alert-circle" : "shield-checkmark"}
                                        size={13}
                                        color={item.is_outside_policy_window ? COLORS.warning : COLORS.success}
                                    />
                                    <Text
                                        style={[
                                            styles.policyText,
                                            item.is_outside_policy_window && styles.policyTextWarning,
                                        ]}
                                    >
                                        {item.is_outside_policy_window
                                            ? `Past ${item.return_window_days}-day return window (Store Credit Required)`
                                            : `Within ${item.return_window_days}-day window`}
                                    </Text>
                                </View>

                                {isSelected && selectedData && (
                                    <View style={styles.itemConfigContainer}>
                                        <View style={styles.configRow}>
                                            <Text style={styles.configLabel}>Return Qty:</Text>
                                            <View style={styles.stepper}>
                                                <TouchableOpacity
                                                    style={styles.stepperButton}
                                                    onPress={() =>
                                                        updateItemQuantity(item.transaction_item_id, -1)
                                                    }
                                                >
                                                    <Text style={styles.stepperButtonText}>-</Text>
                                                </TouchableOpacity>
                                                <Text style={styles.stepperValue}>
                                                    {selectedData.quantity}
                                                </Text>
                                                <TouchableOpacity
                                                    style={styles.stepperButton}
                                                    onPress={() =>
                                                        updateItemQuantity(item.transaction_item_id, 1)
                                                    }
                                                >
                                                    <Text style={styles.stepperButtonText}>+</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        <View style={styles.configRowVertical}>
                                            <Text style={styles.configLabel}>Reason:</Text>
                                            <ScrollView
                                                horizontal
                                                showsHorizontalScrollIndicator={false}
                                                style={styles.pillScroll}
                                            >
                                                {RETURN_REASONS.map((r) => (
                                                    <TouchableOpacity
                                                        key={r}
                                                        style={[
                                                            styles.pill,
                                                            selectedData.return_reason === r &&
                                                            styles.pillActive,
                                                        ]}
                                                        onPress={() =>
                                                            updateItemReason(item.transaction_item_id, r)
                                                        }
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.pillText,
                                                                selectedData.return_reason === r &&
                                                                styles.pillTextActive,
                                                            ]}
                                                        >
                                                            {r.replace("_", " ")}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>

                                        <View style={styles.configRowVertical}>
                                            <Text style={styles.configLabel}>Disposition:</Text>
                                            <ScrollView
                                                horizontal
                                                showsHorizontalScrollIndicator={false}
                                                style={styles.pillScroll}
                                            >
                                                {DISPOSITIONS.map((d) => (
                                                    <TouchableOpacity
                                                        key={d.key}
                                                        style={[
                                                            styles.pill,
                                                            selectedData.disposition === d.key &&
                                                            styles.pillActive,
                                                        ]}
                                                        onPress={() =>
                                                            updateItemDisposition(
                                                                item.transaction_item_id,
                                                                d.key
                                                            )
                                                        }
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.pillText,
                                                                selectedData.disposition === d.key &&
                                                                styles.pillTextActive,
                                                            ]}
                                                        >
                                                            {d.label}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    </View>
                                )}
                            </View>
    );
}
