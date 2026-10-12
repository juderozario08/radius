import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { ENDPOINTS } from "@/constants/routes";
import { globalStyles, SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DetailRow } from "@/components/common/DetailRow";
import React, { useCallback, useEffect, useState } from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import { callApi } from "@/utils/helpers";
import { GetTransactionByIDResponse, Transaction, TransactionItem } from "@/types/sales.types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { formatMoney, multiplyMoney, sumMoney } from "@/utils/money";

export default function TransactionDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { logout } = useAuth();

    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [items, setItems] = useState<TransactionItem[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTransactionDetails = useCallback(async () => {
        if (!id || typeof id !== "string") return;
        setIsLoading(true);
        setError(null);

        const endpoint = ENDPOINTS.SALES_FLOOR.TRANSACTIONS.get(id);
        const data = await callApi<GetTransactionByIDResponse>(endpoint, { method: "GET" }, logout);

        if (data) {
            setTransaction(data.transaction);
            setItems(data.items || []);
        } else {
            setError("Could not load transaction details. Please try again.");
        }
        setIsLoading(false);
    }, [id, logout]);

    useEffect(() => {
        void fetchTransactionDetails();
    }, [fetchTransactionDetails]);

    if (isLoading) {
        return (
            <TopSafeAreaView>
                <HeaderComponent headerLeft={<BackButton />} headerCenter={<Text style={globalStyles.headerTitle}>Loading...</Text>} />
                <View style={globalStyles.container}>
                    <LoadingSpinner style={globalStyles.centerElement} />
                </View>
            </TopSafeAreaView>
        );
    }

    if (error || !transaction) {
        return (
            <TopSafeAreaView>
                <HeaderComponent headerLeft={<BackButton />} headerCenter={<Text style={globalStyles.headerTitle}>Error</Text>} />
                <View style={globalStyles.container}>
                    <Text style={globalStyles.errorText}>{error || "Transaction not found."}</Text>
                </View>
            </TopSafeAreaView>
        );
    }

    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={<Text style={globalStyles.headerTitle}>Transaction #{transaction.transaction_id}</Text>}
            />

            <FlatList
                style={globalStyles.container}
                showsVerticalScrollIndicator={false}
                data={items}
                keyExtractor={(item) => String(item.transaction_item_id)}
                ListHeaderComponent={
                    <>
                        <View style={styles.card}>
                            <View style={globalStyles.cardHeader}>
                                <Text style={styles.sectionTitle}>Details</Text>
                                <StatusBadge isActive={transaction.status === 'COMPLETED'} />
                            </View>
                            <DetailRow label="Type:" value={transaction.transaction_type} />
                            <DetailRow label="Register ID:" value={transaction.register_id} />
                            <DetailRow label="Employee ID:" value={transaction.employee_id || 'N/A'} />
                            <DetailRow label="Store ID:" value={transaction.store_id} />
                            <DetailRow label="Date:" value={new Date(transaction.created_at).toLocaleString()} />
                            <DetailRow label="Payment Method:" value={transaction.payment_method || 'N/A'} />
                            {transaction.payment_method === 'CARD' && transaction.card_type && (
                                <DetailRow label="Card Type:" value={transaction.card_type} />
                            )}
                            {transaction.payment_method === 'CARD' && transaction.card_number && (
                                <DetailRow label="Card Number:" value={`**** **** **** ${transaction.card_number}`} />
                            )}
                            {transaction.payment_reference && (
                                <DetailRow label="Payment Ref:" value={transaction.payment_reference} />
                            )}
                        </View>

                        <View style={styles.card}>
                            <Text style={[styles.sectionTitle, { marginBottom: SPACING.md }]}>Financials</Text>
                            <DetailRow label="Subtotal:" value={formatMoney(transaction.subtotal)} />
                            <DetailRow label="Tax:" value={formatMoney(transaction.tax_amount)} />
                            <DetailRow label="Discount:" value={formatMoney(transaction.discount_total)} />
                            <View style={globalStyles.divider} />
                            <DetailRow label="Total:" value={formatMoney(transaction.total_amount)} />
                            <View style={globalStyles.divider} />
                            <DetailRow label="Cost Total:" value={formatMoney(transaction.cost_total)} />
                            <DetailRow label="Est. Margin:" value={formatMoney(sumMoney([transaction.subtotal, -transaction.cost_total]))} />
                        </View>

                        <View style={globalStyles.listCardTop}>
                            <Text style={[styles.sectionTitle, { marginBottom: SPACING.md }]}>Items ({items.length})</Text>
                        </View>
                    </>
                }
                renderItem={({ item }) => (
                    <View style={globalStyles.listCardBody}>
                        <TouchableOpacity
                            style={styles.itemRow}
                            onPress={() => router.push(`/(app)/product/${item.product_id}`)}
                        >
                            <View style={styles.itemInfo}>
                                <Text style={styles.itemText}>{item.product_name || 'Unknown Product'}</Text>
                                <Text style={styles.itemSubText}>SKU: {item.product_sku || 'N/A'}</Text>
                                <Text style={styles.itemSubText}>Qty: {item.quantity} x {formatMoney(item.unit_price)}</Text>
                                {item.scanned_barcode && <Text style={styles.itemSubText}>Barcode: {item.scanned_barcode}</Text>}
                            </View>
                            <Text style={styles.itemTotal}>
                                {formatMoney(sumMoney([multiplyMoney(item.unit_price, item.quantity), -item.discount_amount]))}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
                ListEmptyComponent={
                    <View style={globalStyles.listCardBody}>
                        <Text style={globalStyles.emptyText}>No items found.</Text>
                    </View>
                }
                ListFooterComponent={
                    <View style={[globalStyles.listCardBottom, styles.listFooter]} />
                }
            />
        </TopSafeAreaView>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 2,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    sectionTitle: {
        fontSize: FONT_SIZE.xl,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    itemInfo: {
        flex: 1,
    },
    listFooter: {
        marginBottom: 56,
    },
    itemText: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    itemSubText: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
    },
    itemTotal: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        color: COLORS.primary,
    }
});
