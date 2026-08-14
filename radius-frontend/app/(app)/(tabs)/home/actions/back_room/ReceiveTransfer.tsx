import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, FlatList, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import HeaderComponent from "@/components/common/HeaderComponent";
import BackButton from "@/components/common/BackButton";
import { SwipeableTopTabs } from "@/components/common/SwipeableTopTabs";
import { globalStyles } from "@/constants/styles";
import { StockTransferDetailResponse, CheckProductInTransferResponse } from "@/types/receiving.types";
import { useAuth } from "@/hooks/useAuth";
import { callApi, showToast } from "@/utils/helpers";
import { ENDPOINTS } from "@/constants/routes";
import { useLocalSearchParams } from "expo-router";
import { BarcodeScanner } from "@/components/common/BarcodeScanner";
import { ReceivingItemCard } from "@/components/receiving/ReceivingItemCard";
import { POItemRow } from "@/components/receiving/POItemRow";
import { COLORS } from "@/constants/colors";

export default function ReceiveTransfer() {
    const { transfer_id } = useLocalSearchParams<{ transfer_id: string }>();
    const { logout } = useAuth();
    
    const [transfer, setTransfer] = useState<StockTransferDetailResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [scannedItems, setScannedItems] = useState<Record<number, number>>({}); // transfer_item_id -> qty
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchTransfer = useCallback(async () => {
        setIsLoading(true);
        const data = await callApi<StockTransferDetailResponse>(`${ENDPOINTS.AUTHENTICATED.RECEIVING.transfer}?transfer_id=${transfer_id}`, { method: "GET" }, logout);
        if (data) {
            setTransfer(data);
            setScannedItems({}); // Reset local scans on refresh
        }
        setIsLoading(false);
    }, [transfer_id, logout]);

    useEffect(() => {
        fetchTransfer();
    }, [fetchTransfer]);

    const handleScan = async (barcode: string) => {
        if (!transfer) return;

        const res = await callApi<CheckProductInTransferResponse>(`${ENDPOINTS.AUTHENTICATED.RECEIVING.checkTransferProduct}?transfer_id=${transfer.transfer_id}&barcode=${barcode}`, { method: "GET" }, logout);
        if (res) {
            if (res.found && res.item) {
                const itemId = res.item.transfer_item_id;
                setScannedItems(prev => {
                    const current = prev[itemId] || 0;
                    if (current + (res.item!.qty_received || 0) < res.item!.qty_requested) {
                        return { ...prev, [itemId]: current + 1 };
                    }
                    showToast("error", "Quantity requested already reached for this item.");
                    return prev;
                });
            } else {
                showToast("error", "This product is not part of this Transfer");
            }
        }
    };

    const handleUpdateScannedQty = (transferItemId: number, qty: number) => {
        setScannedItems(prev => {
            if (qty <= 0) {
                const copy = { ...prev };
                delete copy[transferItemId];
                return copy;
            }
            return { ...prev, [transferItemId]: qty };
        });
    };

    const handleReceiveBatch = async () => {
        if (!transfer || Object.keys(scannedItems).length === 0) return;
        
        setIsSubmitting(true);
        const items = Object.entries(scannedItems).map(([id, qty]) => ({
            transfer_item_id: parseInt(id),
            qty_received: qty
        }));

        const res = await callApi<{ message: string }>(ENDPOINTS.AUTHENTICATED.RECEIVING.receiveTransfer, {
            method: "POST",
            body: { transfer_id: transfer.transfer_id, items }
        }, logout);

        if (res) {
            showToast("success", res.message);
            fetchTransfer();
        }
        setIsSubmitting(false);
    };

    const activeScannedItemsList = useMemo(() => {
        if (!transfer) return [];
        return transfer.items.filter(item => scannedItems[item.transfer_item_id] > 0);
    }, [transfer, scannedItems]);

    const hasScannedItems = Object.keys(scannedItems).length > 0;

    const tabs = [
        {
            name: "Scanner",
            children: () => {
                if (!transfer) return <View />;
                return (
                    <View style={globalStyles.container}>
                        <View style={styles.scannerContainer}>
                            <BarcodeScanner
                                onBarcodeScanned={handleScan}
                            />
                        </View>
                        
                        <View style={styles.scannedListContainer}>
                            {activeScannedItemsList.length === 0 ? (
                                <View style={styles.emptyScanned}>
                                    <Text style={styles.emptyText}>Scan products to receive</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={activeScannedItemsList}
                                    keyExtractor={(item) => item.transfer_item_id.toString()}
                                    renderItem={({ item }) => (
                                        <ReceivingItemCard
                                            item={item}
                                            scannedQty={scannedItems[item.transfer_item_id]}
                                            onUpdateQuantity={(qty) => handleUpdateScannedQty(item.transfer_item_id, qty)}
                                        />
                                    )}
                                    contentContainerStyle={globalStyles.listContainer}
                                />
                            )}
                        </View>

                        <View style={styles.footer}>
                            <TouchableOpacity 
                                style={[styles.receiveButton, (!hasScannedItems || isSubmitting) && styles.receiveButtonDisabled]}
                                onPress={handleReceiveBatch}
                                disabled={!hasScannedItems || isSubmitting}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text style={styles.receiveButtonText}>Receive Items</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            }
        },
        {
            name: "List",
            children: () => {
                if (!transfer) return <View />;
                return (
                    <ScrollView style={globalStyles.container}>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Items</Text>
                            <View>
                                {transfer.items.map(item => (
                                    <POItemRow 
                                        key={item.transfer_item_id} 
                                        item={item} 
                                        pendingScanQty={scannedItems[item.transfer_item_id] || 0}
                                    />
                                ))}
                            </View>
                        </View>
                        <View style={{ height: 40 }} />
                    </ScrollView>
                );
            }
        }
    ];

    if (isLoading && !transfer) {
        return (
            <TopSafeAreaView>
                <HeaderComponent headerLeft={<BackButton />} headerCenter={<View><Text style={styles.headerTitle}>Loading...</Text></View>} />
                <View style={globalStyles.centerElement}><ActivityIndicator size="large" color={COLORS.primary} /></View>
            </TopSafeAreaView>
        );
    }

    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={<View><Text style={styles.headerTitle}>Transfer #{transfer?.transfer_id}</Text></View>}
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
    scannerContainer: {
        height: '40%',
        width: '100%',
    },
    scannedListContainer: {
        flex: 1,
    },
    emptyScanned: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: COLORS.textSecondary,
        fontSize: 16,
    },
    footer: {
        padding: 16,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    receiveButton: {
        backgroundColor: '#388E3C',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    receiveButtonDisabled: {
        opacity: 0.5,
    },
    receiveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    section: {
        marginTop: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginLeft: 16,
        marginBottom: 8,
        color: COLORS.textPrimary,
    }
});
