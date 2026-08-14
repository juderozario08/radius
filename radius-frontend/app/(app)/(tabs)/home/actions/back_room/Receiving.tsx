import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, TextInput } from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import HeaderComponent from "@/components/common/HeaderComponent";
import BackButton from "@/components/common/BackButton";
import { SwipeableTopTabs } from "@/components/common/SwipeableTopTabs";
import { globalStyles } from "@/constants/styles";
import { PurchaseOrderSummary, StockTransferSummary } from "@/types/receiving.types";
import { POCard } from "@/components/receiving/POCard";
import { TransferCard } from "@/components/receiving/TransferCard";
import { useAuth } from "@/hooks/useAuth";
import { callApi, showToast } from "@/utils/helpers";
import { ENDPOINTS } from "@/constants/routes";
import { router } from "expo-router";
import { COLORS } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";

export default function Receiving() {
    const { logout } = useAuth();
    const [pos, setPos] = useState<PurchaseOrderSummary[]>([]);
    const [transfers, setTransfers] = useState<StockTransferSummary[]>([]);
    const [isRefreshingPOs, setIsRefreshingPOs] = useState(false);
    const [isRefreshingTransfers, setIsRefreshingTransfers] = useState(false);
    const [isQuickReceiving, setIsQuickReceiving] = useState<Record<number, boolean>>({});
    const [searchQuery, setSearchQuery] = useState("");

    const fetchPOs = useCallback(async () => {
        setIsRefreshingPOs(true);
        const data = await callApi<{ purchase_orders: PurchaseOrderSummary[] }>(ENDPOINTS.AUTHENTICATED.RECEIVING.purchaseOrders, { method: "GET" }, logout);
        if (data) setPos(data.purchase_orders);
        setIsRefreshingPOs(false);
    }, [logout]);

    const fetchTransfers = useCallback(async () => {
        setIsRefreshingTransfers(true);
        const data = await callApi<{ transfers: StockTransferSummary[] }>(ENDPOINTS.AUTHENTICATED.RECEIVING.transfers, { method: "GET" }, logout);
        if (data) setTransfers(data.transfers);
        setIsRefreshingTransfers(false);
    }, [logout]);

    useEffect(() => {
        fetchPOs();
        fetchTransfers();
    }, [fetchPOs, fetchTransfers]);

    const handleQuickReceive = async (transferId: number) => {
        setIsQuickReceiving(prev => ({ ...prev, [transferId]: true }));
        const res = await callApi<{ message: string }>(ENDPOINTS.AUTHENTICATED.RECEIVING.quickReceiveTransfer, {
            method: "POST",
            body: { transfer_id: transferId }
        }, logout);
        
        if (res) {
            showToast("success", res.message);
            fetchTransfers();
        }
        setIsQuickReceiving(prev => ({ ...prev, [transferId]: false }));
    };

    const filteredPOs = useMemo(() => {
        return pos.filter(po => {
            const query = searchQuery.toLowerCase();
            const matchesSearch = po.po_id.toString().includes(query) || po.supplier_name.toLowerCase().includes(query);
            
            if (query) {
                return matchesSearch;
            } else {
                return po.status !== "RECEIVED";
            }
        });
    }, [pos, searchQuery]);

    const tabs = [
        {
            name: "PO's",
            children: () => (
                <View style={globalStyles.container}>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search POs by ID or Supplier..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor={COLORS.textSecondary}
                        />
                    </View>
                    <FlatList
                        data={filteredPOs}
                        keyExtractor={(item) => item.po_id.toString()}
                        renderItem={({ item }) => (
                            <POCard po={item} onPress={(poId) => router.push(`/(app)/(tabs)/home/actions/back_room/ReceivePO?po_id=${poId}` as any)} />
                        )}
                        contentContainerStyle={globalStyles.listContainer}
                        refreshControl={<RefreshControl refreshing={isRefreshingPOs} onRefresh={fetchPOs} />}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyContainer}>
                                <Text style={globalStyles.emptyText}>No pending POs found</Text>
                            </View>
                        )}
                    />
                </View>
            )
        },
        {
            name: "Transfers",
            children: () => (
                <View style={globalStyles.container}>
                    <FlatList
                        data={transfers}
                        keyExtractor={(item) => item.transfer_id.toString()}
                        renderItem={({ item }) => (
                            <TransferCard 
                                transfer={item} 
                                onPress={(transferId) => router.push(`/(app)/(tabs)/home/actions/back_room/ReceiveTransfer?transfer_id=${transferId}` as any)} 
                                onQuickReceive={handleQuickReceive}
                                isReceiving={isQuickReceiving[item.transfer_id]}
                            />
                        )}
                        contentContainerStyle={globalStyles.listContainer}
                        refreshControl={<RefreshControl refreshing={isRefreshingTransfers} onRefresh={fetchTransfers} />}
                    />
                </View>
            )
        }
    ];

    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={<View><Text style={styles.headerTitle}>Receiving</Text></View>}
            />
            <SwipeableTopTabs tabs={tabs} />
        </TopSafeAreaView>
    );
}

const styles = StyleSheet.create({
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        margin: 16,
        marginBottom: 4,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        height: 44,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: COLORS.textPrimary,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
