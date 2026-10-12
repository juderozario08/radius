import { returnScreenStyles as styles } from "@/components/returns/returnScreenStyles";
import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";
import { LookupTransactionResponse, RecentTransactionSummary, RefundMethod, RtvQueueItem } from "@/types/returns.types";
import { type Money, formatMoney } from "@/utils/money";
import { RETURN_APPROVAL_THRESHOLD } from "@/utils/returnRefund";
import { Ionicons } from "@expo/vector-icons";
import { ComponentProps } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";

type IconName = ComponentProps<typeof Ionicons>["name"];

export type ReturnsTab = "NEW_RETURN" | "HISTORY" | "RTV_QUEUE";
export type LookupMode = "TRANSACTION_ID" | "PRODUCT_BARCODE";

export const REFUND_METHODS: RefundMethod[] = ["CASH", "CARD", "GIFT CARD", "STORE_CREDIT"];
export const HISTORY_STATUS_FILTERS = ["ALL", "PENDING_APPROVAL", "COMPLETED", "REJECTED"];

const TABS: { value: ReturnsTab; label: string; icon: IconName }[] = [
    { value: "NEW_RETURN", label: "Process Return", icon: "return-down-back" },
    { value: "HISTORY", label: "History", icon: "receipt-outline" },
    { value: "RTV_QUEUE", label: "RTV Queue", icon: "cube-outline" },
];

const LOOKUP_MODES: { value: LookupMode; label: string; icon: IconName }[] = [
    { value: "TRANSACTION_ID", label: "Receipt Lookup", icon: "receipt-outline" },
    { value: "PRODUCT_BARCODE", label: "Product Scan", icon: "barcode-outline" },
];

export function ReturnsTabBar({ activeTab, onChange }: { activeTab: ReturnsTab; onChange: (tab: ReturnsTab) => void }) {
    return (
        <View style={styles.tabBar}>
            {TABS.map((tab) => {
                const isActive = activeTab === tab.value;
                return (
                    <TouchableOpacity
                        key={tab.value}
                        style={[styles.tabButton, isActive && styles.tabButtonActive]}
                        onPress={() => onChange(tab.value)}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: isActive }}
                    >
                        <Ionicons name={tab.icon} size={16} color={isActive ? COLORS.primary : COLORS.textSecondary} />
                        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

export function HistoryStatusFilters({ value, onChange }: { value: string; onChange: (status: string) => void }) {
    return (
        <View style={styles.filterPillsRow}>
            {HISTORY_STATUS_FILTERS.map((status) => {
                const isActive = value === status;
                return (
                    <TouchableOpacity
                        key={status}
                        style={[styles.filterPill, isActive && styles.filterPillActive]}
                        onPress={() => onChange(status)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isActive }}
                    >
                        <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>{status.replace("_", " ")}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

interface ReturnLookupPanelProps {
    mode: LookupMode;
    onModeChange: (mode: LookupMode) => void;
    query: string;
    onQueryChange: (query: string) => void;
    onSearch: () => void;
    isSearching: boolean;
    recentResults: RecentTransactionSummary[];
    onSelectTransaction: (transactionId: number) => void;
    transaction: LookupTransactionResponse | null;
}

export function ReturnLookupPanel({ mode, onModeChange, query, onQueryChange, onSearch, isSearching, recentResults, onSelectTransaction, transaction }: ReturnLookupPanelProps) {
    const isReceipt = mode === "TRANSACTION_ID";
    return (
        <View style={styles.newReturnHeader}>
            <View style={styles.lookupCard}>
                <View style={styles.lookupModeRow}>
                    {LOOKUP_MODES.map((option) => {
                        const isActive = mode === option.value;
                        return (
                            <TouchableOpacity
                                key={option.value}
                                style={[styles.modeToggle, isActive && styles.modeToggleActive]}
                                onPress={() => onModeChange(option.value)}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isActive }}
                            >
                                <Ionicons name={option.icon} size={14} color={isActive ? COLORS.primary : COLORS.textSecondary} />
                                <Text style={[styles.modeToggleText, isActive && styles.modeToggleTextActive]}>{option.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={styles.searchInputRow}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder={isReceipt ? "Enter Transaction ID (e.g. 1042)..." : "Enter UPC or SKU..."}
                        placeholderTextColor={COLORS.placeholder}
                        value={query}
                        onChangeText={onQueryChange}
                        keyboardType={isReceipt ? "number-pad" : "default"}
                        returnKeyType="search"
                        onSubmitEditing={onSearch}
                    />
                    <TouchableOpacity style={styles.searchButton} onPress={onSearch} disabled={isSearching} accessibilityRole="button" accessibilityLabel="Search">
                        {isSearching ? (
                            <ActivityIndicator size="small" color={COLORS.primaryText} />
                        ) : (
                            <Ionicons name="search" size={18} color={COLORS.primaryText} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {recentResults.length > 0 && (
                <View style={styles.recentResultsContainer}>
                    <Text style={styles.sectionHeader}>Recent Purchases for this Product</Text>
                    {recentResults.map((tx) => (
                        <TouchableOpacity key={tx.transaction_id} style={styles.recentTxItem} onPress={() => onSelectTransaction(tx.transaction_id)} accessibilityRole="button">
                            <View>
                                <Text style={styles.recentTxId}>Sale #{tx.transaction_id}</Text>
                                <Text style={styles.recentTxDate}>
                                    {new Date(tx.created_at).toLocaleDateString()} • Register {tx.register_id}
                                </Text>
                            </View>
                            <View style={styles.recentTxRight}>
                                <Text style={styles.recentTxAmount}>{formatMoney(tx.total_amount)}</Text>
                                <Text style={styles.recentTxQty}>Qty: {tx.quantity_sold}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {transaction && (
                <>
                    <View style={styles.txSummaryBanner}>
                        <View style={styles.txSummaryLeft}>
                            <Text style={styles.txSummaryId}>Sale #{transaction.transaction_id}</Text>
                            <Text style={styles.txSummaryDate}>
                                Purchased {transaction.days_since_sale} days ago ({new Date(transaction.created_at).toLocaleDateString()})
                            </Text>
                        </View>
                        <View style={styles.txSummaryRight}>
                            <Text style={styles.txSummaryAmount}>{formatMoney(transaction.total_amount)}</Text>
                            <Text style={styles.txSummaryMethod}>{transaction.payment_method}</Text>
                        </View>
                    </View>
                    <Text style={styles.sectionHeader}>Select Items to Return</Text>
                </>
            )}
        </View>
    );
}

interface RefundSummaryCardProps {
    itemCount: number;
    subtotal: Money;
    tax: Money;
    total: Money;
    needsApproval: boolean;
    refundMethod: RefundMethod;
    onRefundMethodChange: (method: RefundMethod) => void;
    storeCreditOnly: boolean;
    notes: string;
    onNotesChange: (notes: string) => void;
    isSubmitting: boolean;
    onSubmit: () => void;
}

export function RefundSummaryCard({ itemCount, subtotal, tax, total, needsApproval, refundMethod, onRefundMethodChange, storeCreditOnly, notes, onNotesChange, isSubmitting, onSubmit }: RefundSummaryCardProps) {
    return (
        <View style={[styles.refundCalculationCard, styles.refundFooter]}>
            <Text style={styles.sectionHeader}>Refund Summary</Text>

            <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Subtotal ({itemCount} items):</Text>
                <Text style={styles.calcValue}>{formatMoney(subtotal)}</Text>
            </View>
            <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Tax (as charged on receipt):</Text>
                <Text style={styles.calcValue}>{formatMoney(tax)}</Text>
            </View>
            <View style={[styles.calcRow, styles.calcRowTotal]}>
                <Text style={styles.totalRefundLabel}>Total Refund:</Text>
                <Text style={styles.totalRefundValue}>{formatMoney(total)}</Text>
            </View>

            {needsApproval && (
                <View style={styles.approvalNotice}>
                    <Ionicons name="information-circle" size={16} color={COLORS.warning} />
                    <Text style={styles.approvalNoticeText}>
                        Total exceeds {formatMoney(RETURN_APPROVAL_THRESHOLD)}. This return will be queued for Manager Approval.
                    </Text>
                </View>
            )}

            <View style={styles.methodContainer}>
                <Text style={styles.methodTitle}>Refund Method:</Text>
                <View style={styles.methodButtonsRow}>
                    {REFUND_METHODS.map((method) => {
                        const isDisabled = storeCreditOnly && method !== "STORE_CREDIT";
                        const isSelected = refundMethod === method;
                        return (
                            <TouchableOpacity
                                key={method}
                                style={[styles.methodButton, isSelected && styles.methodButtonSelected, isDisabled && styles.methodButtonDisabled]}
                                onPress={() => !isDisabled && onRefundMethodChange(method)}
                                disabled={isDisabled}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isSelected, disabled: isDisabled }}
                            >
                                <Text style={[styles.methodButtonText, isSelected && styles.methodButtonTextSelected, isDisabled && styles.methodButtonTextDisabled]}>
                                    {method.replace("_", " ")}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <TextInput
                style={styles.notesInput}
                placeholder="Optional return notes or reason details..."
                placeholderTextColor={COLORS.placeholder}
                value={notes}
                onChangeText={onNotesChange}
                multiline
            />

            <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={onSubmit}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityState={{ disabled: isSubmitting }}
            >
                {isSubmitting ? (
                    <ActivityIndicator size="small" color={COLORS.primaryText} />
                ) : (
                    <Text style={styles.submitButtonText}>Process Return ({formatMoney(total)})</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

export function RtvQueueCard({ item }: { item: RtvQueueItem }) {
    return (
        <View style={[globalStyles.card, styles.rtvCard]}>
            <View style={styles.rtvCardHeader}>
                <View>
                    <Text style={styles.rtvProductName}>{item.product_name}</Text>
                    <Text style={styles.rtvSku}>
                        SKU: {item.sku} • UPC: {item.upc}
                    </Text>
                </View>
                <View style={styles.rtvBadge}>
                    <Text style={styles.rtvBadgeText}>{item.status}</Text>
                </View>
            </View>
            <View style={styles.rtvCardFooter}>
                <Text style={styles.rtvQty}>Qty: {item.quantity}</Text>
                {item.supplier_name && <Text style={styles.rtvSupplier}>Vendor: {item.supplier_name}</Text>}
                <Text style={styles.rtvDate}>Queued: {new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
        </View>
    );
}
