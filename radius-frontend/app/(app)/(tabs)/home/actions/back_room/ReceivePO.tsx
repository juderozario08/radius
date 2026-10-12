import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, FlatList, SectionList, ActivityIndicator, TouchableOpacity } from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import HeaderComponent from "@/components/common/HeaderComponent";
import BackButton from "@/components/common/BackButton";
import { SwipeableTopTabs } from "@/components/common/SwipeableTopTabs";
import { globalStyles, SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";
import { PurchaseOrderDetailResponse, CheckProductInPOResponse, PurchaseOrderItemDetail, PurchaseOrderLPR } from "@/types/receiving.types";
import { useAuth } from "@/hooks/useAuth";
import { callApi, showToast } from "@/utils/helpers";
import { ENDPOINTS } from "@/constants/routes";
import { useLocalSearchParams } from "expo-router";
import { BarcodeScanner } from "@/components/common/BarcodeScanner";
import { ReceivingItemCard } from "@/components/receiving/ReceivingItemCard";
import { POItemRow } from "@/components/receiving/POItemRow";
import { LPRCard } from "@/components/receiving/LPRCard";
import { COLORS } from "@/constants/colors";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

type POListEntry =
    | { kind: "lpr"; lpr: PurchaseOrderLPR }
    | { kind: "item"; item: PurchaseOrderItemDetail };

type POListSection = { title: string; data: POListEntry[] };

export default function ReceivePO() {
    const { po_id } = useLocalSearchParams<{ po_id: string }>();
    const { logout } = useAuth();

    const [po, setPo] = useState<PurchaseOrderDetailResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [scannedItems, setScannedItems] = useState<Record<number, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchPO = useCallback(async () => {
        setIsLoading(true);
        const data = await callApi<PurchaseOrderDetailResponse>(ENDPOINTS.SALES_FLOOR.RECEIVING.purchaseOrder(po_id as string), { method: "GET" }, logout);
        if (data) {
            setPo(data);
            setScannedItems({});
        }
        setIsLoading(false);
    }, [po_id, logout]);

    useEffect(() => {
        fetchPO();
    }, [fetchPO]);

    const handleScan = async (barcode: string) => {
        if (!po) return;

        if (barcode.length === 20) {
            const res = await callApi<{ message: string }>(ENDPOINTS.SALES_FLOOR.RECEIVING.receiveLpr(po.po_id), {
                method: "POST",
                body: { lpr_barcode: barcode }
            }, logout);
            if (res) {
                showToast("success", res.message);
                fetchPO();
            }
            return;
        }

        if (po.has_lprs) {
            showToast("error", "This PO has LPRs. Please scan the LPR barcodes on the boxes instead of individual products.");
            return;
        }

        const res = await callApi<CheckProductInPOResponse>(`${ENDPOINTS.SALES_FLOOR.RECEIVING.checkProduct(po.po_id)}?barcode=${barcode}`, { method: "GET" }, logout);
        if (res) {
            if (res.found && res.item) {
                const itemId = res.item.po_item_id;
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

        const res = await callApi<{ message: string }>(ENDPOINTS.SALES_FLOOR.RECEIVING.receivePo(po.po_id), {
            method: "POST",
            body: { items }
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
                const sections: POListSection[] = [
                    ...(po.has_lprs && po.lprs.length > 0
                        ? [{ title: "LPRs", data: po.lprs.map((lpr): POListEntry => ({ kind: "lpr", lpr })) }]
                        : []),
                    { title: "Items", data: po.items.map((item): POListEntry => ({ kind: "item", item })) },
                ];
                return (
                    <SectionList
                        style={globalStyles.container}
                        sections={sections}
                        stickySectionHeadersEnabled={false}
                        keyExtractor={(entry) => entry.kind === "lpr" ? `lpr-${entry.lpr.lpr_id}` : `item-${entry.item.po_item_id}`}
                        renderSectionHeader={({ section }) => (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>{section.title}</Text>
                            </View>
                        )}
                        renderItem={({ item: entry }) => entry.kind === "lpr" ? (
                            <View style={globalStyles.paddingHorizontal}>
                                <LPRCard lpr={entry.lpr} />
                            </View>
                        ) : (
                            <POItemRow
                                item={entry.item}
                                pendingScanQty={scannedItems[entry.item.po_item_id] || 0}
                            />
                        )}
                        contentContainerStyle={styles.listContent}
                    />
                );
            }
        }
    ];

    if (isLoading && !po) {
        return (
            <TopSafeAreaView>
                <HeaderComponent headerLeft={<BackButton />} headerCenter={<View><Text style={styles.headerTitle}>Loading...</Text></View>} />
                <View style={globalStyles.centerElement}><LoadingSpinner /></View>
            </TopSafeAreaView>
        );
    }

    if (!isLoading && !po) {
        return (
            <TopSafeAreaView>
                <HeaderComponent headerLeft={<BackButton />} headerCenter={<View><Text style={styles.headerTitle}>Purchase Order</Text></View>} />
                <View style={[globalStyles.centerElement, { padding: SPACING.xxl }]}>
                    <Text style={[styles.headerTitle, { color: COLORS.error, marginBottom: SPACING.sm }]}>PO Not Found</Text>
                    <Text style={globalStyles.emptyText}>Purchase Order #{po_id} could not be found or is not accessible.</Text>
                </View>
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
        fontSize: FONT_SIZE.xl,
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
        fontSize: FONT_SIZE.lg,
    },
    footer: {
        padding: SPACING.lg,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    receiveButton: {
        backgroundColor: COLORS.successAccent,
        paddingVertical: SPACING.mdl,
        borderRadius: RADIUS.md,
        alignItems: 'center',
    },
    receiveButtonDisabled: {
        opacity: 0.5,
    },
    receiveButtonText: {
        color: 'white',
        fontSize: FONT_SIZE.lg,
        fontWeight: 'bold',
    },
    section: {
        marginTop: SPACING.lg,
    },
    listContent: {
        paddingBottom: SPACING.huge,
    },
    sectionTitle: {
        fontSize: FONT_SIZE.xl,
        fontWeight: "bold",
        marginLeft: SPACING.lg,
        marginBottom: SPACING.sm,
        color: COLORS.textPrimary,
    }
});
