import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { ENDPOINTS } from "@/constants/routes";
import { globalStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DetailRow } from "@/components/common/DetailRow";
import React, { useEffect, useState, useCallback } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import CustomToast from "@/components/common/Toast";
import { callApi } from "@/utils/helpers";
import Pagination from "@/components/common/Pagination";
import { GetAllTransactionsResponse, Transaction } from "@/types/sales.types";
import { router } from "expo-router";

export default function TransactionsList() {
    const { logout } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalLength, setTotalLength] = useState(0);

    useEffect(() => {
        fetchTransactions(pageNumber, pageSize);
    }, [pageNumber, pageSize]);

    const fetchTransactions = async (page: number, limit: number) => {
        setIsLoading(true);
        setError(null);

        const endpoint = `${ENDPOINTS.AUTHENTICATED.SALES.TRANSACTIONS.getAll}?page_size=${limit}&page_number=${page}`;
        const data = await callApi<GetAllTransactionsResponse>(endpoint, { method: "GET" }, logout);

        if (data) {
            setTransactions(data.transactions || []);
            setTotalLength(data.total_length || 0);
        } else {
            setError("Could not load transactions. Please try again.");
        }
        setIsLoading(false);
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setPageNumber(1);
    };

    const renderTransactionCard = useCallback(({ item }: { item: Transaction }) => {
        const date = new Date(item.created_at).toLocaleString();

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => router.push(`/(app)/(tabs)/home/actions/sales_floor/Transactions/${item.transaction_id}` as any)}
            >
                <View style={globalStyles.cardHeader}>
                    <Text style={styles.name}>TXN #{item.transaction_id}</Text>
                    <StatusBadge isActive={item.status === 'COMPLETED'} />
                </View>
                <View style={styles.detailsContainer}>
                    <DetailRow layout="inline" label="Type: " value={item.transaction_type} />
                    <DetailRow layout="inline" label="Total: " value={`$${item.total_amount.toFixed(2)}`} />
                    <DetailRow layout="inline" label="Date: " value={date} />
                    <DetailRow layout="inline" label="Store ID: " value={item.store_id} />
                </View>
            </TouchableOpacity>
        );
    }, []);

    const totalPages = Math.max(1, Math.ceil(totalLength / pageSize));

    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={<Text style={globalStyles.headerTitle}>Transactions</Text>}
            />

            <View style={[globalStyles.container, styles.listWrapper]}>
                {isLoading && transactions.length === 0 ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={globalStyles.centerElement} />
                ) : error ? (
                    <Text style={globalStyles.errorText}>{error}</Text>
                ) : (
                    <>
                        {transactions.length === 0 ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={globalStyles.emptyText}>No transactions found.</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={transactions}
                                keyExtractor={(item) => item.transaction_id.toString()}
                                renderItem={renderTransactionCard}
                                contentContainerStyle={globalStyles.listContainer}
                                showsVerticalScrollIndicator={false}
                                initialNumToRender={10}
                                windowSize={5}
                                maxToRenderPerBatch={10}
                            />
                        )}

                        <Pagination
                            currentPage={pageNumber}
                            totalPages={totalPages}
                            onPageChange={setPageNumber}
                            isLoading={isLoading}
                            pageSize={pageSize}
                            pageSizeOptions={[10, 20, 50]}
                            onPageSizeChange={handlePageSizeChange}
                        />
                    </>
                )}
            </View>
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
    listWrapper: {
        flex: 1,
        paddingBottom: 0,
    },
    name: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.textPrimary,
        flex: 1,
        marginRight: 8
    },
    detailsContainer: {
        gap: 6
    },
});
