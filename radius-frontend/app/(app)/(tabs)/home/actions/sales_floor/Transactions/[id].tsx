import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { ENDPOINTS } from "@/constants/routes";
import { globalStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DetailRow } from "@/components/common/DetailRow";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import CustomToast from "@/components/common/Toast";
import { callApi } from "@/utils/helpers";
import { GetTransactionByIDResponse, Transaction, TransactionItem } from "@/types/sales.types";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function TransactionDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { logout } = useAuth();

    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [items, setItems] = useState<TransactionItem[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            fetchTransactionDetails();
        }
    }, [id]);

    const fetchTransactionDetails = async () => {
        setIsLoading(true);
        setError(null);

        const endpoint = `${ENDPOINTS.AUTHENTICATED.SALES.TRANSACTIONS.get}?id=${id}`;
        const data = await callApi<GetTransactionByIDResponse>(endpoint, { method: "GET" }, logout);

        if (data) {
            setTransaction(data.transaction);
            setItems(data.items || []);
        } else {
            setError("Could not load transaction details. Please try again.");
        }
        setIsLoading(false);
    };

    if (isLoading) {
        return (
            <TopSafeAreaView>
                <HeaderComponent headerLeft={<BackButton />} headerCenter={<Text style={globalStyles.headerTitle}>Loading...</Text>} />
                <View style={globalStyles.container}>
                    <ActivityIndicator size="large" color={COLORS.primary} style={globalStyles.centerElement} />
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

            <ScrollView style={globalStyles.container} showsVerticalScrollIndicator={false}>
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
                    <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Financials</Text>
                    <DetailRow label="Subtotal:" value={`$${transaction.subtotal.toFixed(2)}`} />
                    <DetailRow label="Tax:" value={`$${transaction.tax_amount.toFixed(2)}`} />
                    <DetailRow label="Discount:" value={`$${transaction.discount_total.toFixed(2)}`} />
                    <View style={globalStyles.divider} />
                    <DetailRow label="Total:" value={`$${transaction.total_amount.toFixed(2)}`} />
                    <View style={globalStyles.divider} />
                    <DetailRow label="Cost Total:" value={`$${transaction.cost_total.toFixed(2)}`} />
                    <DetailRow label="Est. Margin:" value={`$${(transaction.subtotal - transaction.cost_total).toFixed(2)}`} />
                </View>

                <View style={styles.card}>
                    <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Items ({items.length})</Text>
                    {items.map((item) => (
                        <TouchableOpacity 
                            key={item.transaction_item_id} 
                            style={styles.itemRow}
                            onPress={() => router.push(`/(app)/(tabs)/inventory/${item.product_id}` as any)}
                        >
                            <View style={styles.itemInfo}>
                                <Text style={styles.itemText}>Product SKU: {item.product_sku || 'N/A'}</Text>
                                <Text style={styles.itemSubText}>Product ID: {item.product_id}</Text>
                                <Text style={styles.itemSubText}>Qty: {item.quantity} x ${item.unit_price.toFixed(2)}</Text>
                                {item.scanned_barcode && <Text style={styles.itemSubText}>Barcode: {item.scanned_barcode}</Text>}
                            </View>
                            <Text style={styles.itemTotal}>
                                ${((item.quantity * item.unit_price) - item.discount_amount).toFixed(2)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    {items.length === 0 && <Text style={globalStyles.emptyText}>No items found.</Text>}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
            <CustomToast />
        </TopSafeAreaView>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    itemInfo: {
        flex: 1,
    },
    itemText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    itemSubText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    itemTotal: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.primary,
    }
});
