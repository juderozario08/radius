import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, FlatList, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import HeaderComponent from "@/components/common/HeaderComponent";
import BackButton from "@/components/common/BackButton";
import { SwipeableTopTabs } from "@/components/common/SwipeableTopTabs";
import { globalStyles } from "@/constants/styles";
import { PurchaseOrderDetailResponse, CheckProductInPOResponse } from "@/types/receiving.types";
import { useAuth } from "@/hooks/useAuth";
import { callApi, showToast } from "@/utils/helpers";
import { ENDPOINTS } from "@/constants/routes";
import { useLocalSearchParams } from "expo-router";
import { BarcodeScanner } from "@/components/common/BarcodeScanner";
import { ReceivingItemCard } from "@/components/receiving/ReceivingItemCard";
import { POItemRow } from "@/components/receiving/POItemRow";
import { LPRCard } from "@/components/receiving/LPRCard";
import { COLORS } from "@/constants/colors";

export default function ReceivePO() {
    const { po_id } = useLocalSearchParams<{ po_id: string }>();
    const { logout } = useAuth();
    
    const [po, setPo] = useState<PurchaseOrderDetailResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [scannedItems, setScannedItems] = useState<Record<number, number>>({}); // po_item_id -> qty
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchPO = useCallback(async () => {
        setIsLoading(true);
        const data = await callApi<PurchaseOrderDetailResponse>(`${ENDPOINTS.AUTHENTICATED.RECEIVING.purchaseOrder}?po_id=${po_id}`, { method: "GET" }, logout);
        if (data) {
            setPo(data);
            setScannedItems({}); // Reset local scans on refresh
        }
        setIsLoading(false);
    }, [po_id, logout]);

    useEffect(() => {
        fetchPO();
    }, [fetchPO]);

    const handleScan = async (barcode: string) => {
        if (!po) return;

        // 20 digits = LPR
        if (barcode.length === 20) {
            const res = await callApi<{ message: string }>(ENDPOINTS.AUTHENTICATED.RECEIVING.receiveLpr, {
                method: "POST",
                body: { po_id: po.po_id, lpr_barcode: barcode }
            }, logout);
            if (res) {
                showToast("success", res.message);
                fetchPO();
            }
            return;
        }

        // If it's a product but the PO has LPRs, reject it
        if (po.has_lprs) {
            showToast("error", "This PO has LPRs. Please scan the LPR barcodes on the boxes instead of individual products.");
            return;
        }

        // Otherwise product
        const res = await callApi<CheckProductInPOResponse>(`${ENDPOINTS.AUTHENTICATED.RECEIVING.checkProduct}?po_id=${po.po_id}&barcode=${barcode}`, { method: "GET" }, logout);
        if (res) {
            if (res.found && res.item) {
                const itemId = res.item.po_item_id;
                // Auto increment local qty if there is room
                setScannedItems(prev => {
                    const current = prev[itemId] || 0;
                    if (current + res.item!.qty_received < res.item!.qty_ordered) {
                        return { ...prev, [itemId]: current + 1 };
                    }
                    showToast("error", "Quantity ordered already reached for this item.");
                    return prev;
                });
            } else {
                showToast("error", "This product is not part of this PO");
            }
        }
    };

    const handleUpdateScannedQty = (poItemId: number, qty: number) => {
        setScannedItems(prev => {
            if (qty <= 0) {
                const copy = { ...prev };
                delete copy[poItemId];
                return copy;
            }
            return { ...prev, [poItemId]: qty };
        });
    };

    const handleReceiveBatch = async () => {
        if (!po || Object.keys(scannedItems).length === 0) return;
        
        setIsSubmitting(true);
        const items = Object.entries(scannedItems).map(([id, qty]) => ({
            po_item_id: parseInt(id),
            qty_received: qty
        }));

        const res = await callApi<{ message: string }>(ENDPOINTS.AUTHENTICATED.RECEIVING.receivePo, {
            method: "POST",
            body: { po_id: po.po_id, items }
        }, logout);

        if (res) {
            showToast("success", res.message);
            fetchPO();
        }
        setIsSubmitting(false);
    };

    const activeScannedItemsList = useMemo(() => {
        if (!po) return [];
        return po.items.filter(item => scannedItems[item.po_item_id] > 0);
    }, [po, scannedItems]);

    const hasScannedItems = Object.keys(scannedItems).length > 0;

    const tabs = [
        {
            name: "Scanner",
            children: () => {
                if (!po) return <View />;
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
                                    <Text style={styles.emptyText}>Scan products or LPRs to receive</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={activeScannedItemsList}
                                    keyExtractor={(item) => item.po_item_id.toString()}
                                    renderItem={({ item }) => (
                                        <ReceivingItemCard
                                            item={item}
                                            scannedQty={scannedItems[item.po_item_id]}
                                            onUpdateQuantity={(qty) => handleUpdateScannedQty(item.po_item_id, qty)}
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
                if (!po) return <View />;
                return (
                    <ScrollView style={globalStyles.container}>
                        {po.has_lprs && po.lprs.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>LPRs</Text>
                                <View style={globalStyles.paddingHorizontal}>
                                    {po.lprs.map(lpr => (
                                        <LPRCard key={lpr.lpr_id} lpr={lpr} />
                                    ))}
                                </View>
                            </View>
                        )}
                        
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Items</Text>
                            <View>
                                {po.items.map(item => (
                                    <POItemRow 
                                        key={item.po_item_id} 
                                        item={item} 
                                        pendingScanQty={scannedItems[item.po_item_id] || 0}
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

    if (isLoading && !po) {
        return (
            <TopSafeAreaView>
                <HeaderComponent headerLeft={<BackButton />} headerCenter={<View><Text style={styles.headerTitle}>Loading...</Text></View>} />
                <View style={globalStyles.centerElement}><ActivityIndicator size="large" color={COLORS.primary} /></View>
            </TopSafeAreaView>
        );
    }

    const poNumber = po?.po_id.toString().padStart(8, '0') || '';

    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={<View><Text style={styles.headerTitle}>PO #{poNumber}</Text></View>}
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
