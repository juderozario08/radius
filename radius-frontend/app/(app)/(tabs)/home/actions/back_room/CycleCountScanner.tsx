// radius-frontend/app/(app)/home/actions/back_room/CycleCountScanner.tsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import HeaderComponent from "@/components/common/HeaderComponent";
import BackButton from "@/components/common/BackButton";
import { BarcodeScanner, BarcodeScannerRef } from "@/components/common/BarcodeScanner";
import { ENDPOINTS } from "@/constants/routes";
import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";
import { useAuth } from "@/hooks/useAuth";
import { callApi } from "@/utils/helpers";
import { router, useLocalSearchParams } from "expo-router";
import {
    CycleCountItemDetail,
    CycleCountDetailResponse,
} from "@/types/cyclecount.types";
import { Ionicons } from "@expo/vector-icons";

type ScannerTab = "SCANNER" | "LIST";

export default function CycleCountScanner() {
    const { logout } = useAuth();
    const params = useLocalSearchParams();
    const countId = Number(params.id);

    const scannerRef = useRef<BarcodeScannerRef>(null);

    const [detail, setDetail] = useState<CycleCountDetailResponse | null>(null);
    const [activeTab, setActiveTab] = useState<ScannerTab>("SCANNER");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [manualBarcode, setManualBarcode] = useState("");
    const [successBanner, setSuccessBanner] = useState<string | null>(null);

    const fetchDetail = useCallback(async () => {
        if (!countId) return;
        try {
            const data = await callApi<CycleCountDetailResponse>(
                `${ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.getDetail}?id=${countId}`,
                { method: "GET" },
                logout
            );
            if (data) {
                setDetail(data);
            } else {
                router.replace("/(app)/(tabs)/home/actions/back_room/CycleCount" as any);
            }
        } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to load count data");
            router.replace("/(app)/(tabs)/home/actions/back_room/CycleCount" as any);
        } finally {
            setIsLoading(false);
        }
    }, [countId, logout]);

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    // Handle barcode scan (from camera or manual text input)
    const handleBarcodeLookup = async (barcodeToSearch: string) => {
        const query = barcodeToSearch.trim();
        if (!query || !detail) return;

        setIsSaving(true);
        try {
            const updatedItem = await callApi<CycleCountItemDetail>(
                ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.scan,
                {
                    method: "POST",
                    body: JSON.stringify({
                        count_id: countId,
                        barcode: query,
                    }),
                },
                logout
            );

            if (updatedItem) {
                // Update or append item in local state
                setDetail((prev) => {
                    if (!prev) return prev;
                    const exists = prev.items.some((i) => i.product_id === updatedItem.product_id);
                    let newItems: CycleCountItemDetail[];
                    if (exists) {
                        newItems = prev.items.map((i) =>
                            i.product_id === updatedItem.product_id ? updatedItem : i
                        );
                    } else {
                        // Newly discovered product (was 0 qty / unlisted in initial list)
                        newItems = [updatedItem, ...prev.items];
                    }
                    return {
                        ...prev,
                        count: {
                            ...prev.count,
                            total_items: exists ? prev.count.total_items : prev.count.total_items + 1,
                            counted_items: newItems.filter((i) => i.counted_qty > 0).length,
                        },
                        items: newItems,
                    };
                });

                const isNew = !detail.items.some((i) => i.product_id === updatedItem.product_id);
                if (isNew) {
                    setSuccessBanner(
                        `✓ Discovered Product: ${updatedItem.product_name} | Scanned: ${updatedItem.counted_qty} (Expected: ${updatedItem.expected_qty})`
                    );
                } else {
                    setSuccessBanner(
                        `✓ Scanned: ${updatedItem.product_name} | Scanned: ${updatedItem.counted_qty} / Expected: ${updatedItem.expected_qty}`
                    );
                }
                setManualBarcode("");

                // Auto-hide success banner after 4 seconds
                setTimeout(() => {
                    setSuccessBanner(null);
                }, 4000);
            }
        } catch (err: any) {
            Alert.alert("Product Lookup / Scan Error", err.message || "Failed to record scan", [
                {
                    text: "OK",
                    onPress: () => scannerRef.current?.resetScanner(),
                },
            ]);
        } finally {
            setIsSaving(false);
            scannerRef.current?.resetScanner();
        }
    };

    // Stepper quantity adjust
    const handleStepperAdjust = async (item: CycleCountItemDetail, delta: number) => {
        const newQty = Math.max(0, item.counted_qty + delta);
        if (newQty === item.counted_qty) return;

        setIsSaving(true);
        try {
            await callApi(
                ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.scan,
                {
                    method: "POST",
                    body: JSON.stringify({
                        count_id: countId,
                        product_id: item.product_id,
                        counted_qty: newQty,
                    }),
                },
                logout
            );

            setDetail((prev) => {
                if (!prev) return prev;
                const updatedItems = prev.items.map((i) =>
                    i.product_id === item.product_id
                        ? { ...i, counted_qty: newQty, variance: newQty - i.expected_qty }
                        : i
                );
                return { ...prev, items: updatedItems };
            });
        } catch (err: any) {
            Alert.alert("Update Error", err.message || "Failed to update quantity");
        } finally {
            setIsSaving(false);
        }
    };

    const renderListItem = ({ item }: { item: CycleCountItemDetail }) => {
        const isMatched = item.counted_qty === item.expected_qty && item.counted_qty > 0;
        const isDiscrepancy = item.counted_qty > 0 && item.variance !== 0;

        let badgeBg = "#F5F5F5";
        let badgeBorder = "#E0E0E0";
        let badgeColor = COLORS.textSecondary;

        if (isMatched) {
            badgeBg = "#E8F5E9";
            badgeBorder = "#A5D6A7";
            badgeColor = COLORS.success;
        } else if (isDiscrepancy) {
            badgeBg = item.variance < 0 ? "#FFEBEE" : "#E0F2F1";
            badgeBorder = item.variance < 0 ? "#EF9A9A" : "#80CBC4";
            badgeColor = item.variance < 0 ? COLORS.error : "#00695C";
        }

        return (
            <View style={styles.listItemCard}>
                <View style={styles.listItemTop}>
                    <View style={styles.productIconWrapper}>
                        <Ionicons name="cube-outline" size={24} color={COLORS.textSecondary} />
                    </View>
                    <View style={styles.listItemInfo}>
                        <Text style={styles.listItemName} numberOfLines={2}>
                            {item.product_name}
                        </Text>
                        <Text style={styles.listItemSub}>
                            SKU: {item.sku}  UPC: {item.upc}
                        </Text>

                        {/* Dual metric row: Expected vs Scanned */}
                        <View style={styles.metricsRow}>
                            <View style={styles.metricBadge}>
                                <Text style={styles.metricLabel}>Expected:</Text>
                                <Text style={styles.metricValExpected}>{item.expected_qty}</Text>
                            </View>
                            <View style={styles.metricBadge}>
                                <Text style={styles.metricLabel}>Scanned:</Text>
                                <Text style={[styles.metricValScanned, { color: badgeColor }]}>
                                    {item.counted_qty}
                                </Text>
                            </View>
                            {item.counted_qty > 0 && (
                                <View style={[styles.varianceBadge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
                                    <Text style={[styles.varianceBadgeText, { color: badgeColor }]}>
                                        {isMatched ? "Matched" : item.variance > 0 ? `+${item.variance}` : `${item.variance}`}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* Stepper */}
                <View style={styles.stepperRow}>
                    <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => handleStepperAdjust(item, -1)}
                        disabled={isSaving || item.counted_qty <= 0}
                    >
                        <Ionicons name="remove" size={22} color={COLORS.textPrimary} />
                    </TouchableOpacity>

                    <View style={styles.stepperValueContainer}>
                        <Text style={styles.stepperValue}>{item.counted_qty}</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => handleStepperAdjust(item, 1)}
                        disabled={isSaving}
                    >
                        <Ionicons name="add" size={22} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (isLoading || !detail) {
        return (
            <TopSafeAreaView>
                <HeaderComponent
                    headerLeft={<BackButton />}
                    headerCenter={<Text style={globalStyles.headerTitle}>Cycle Count</Text>}
                />
                <View style={globalStyles.centerElement}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </TopSafeAreaView>
        );
    }

    const { count, items } = detail;

    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={
                    <Text style={globalStyles.headerTitle}>High Ticket #{count.count_id}</Text>
                }
                headerRight={
                    <TouchableOpacity
                        onPress={() => {
                            fetchDetail();
                            scannerRef.current?.resetScanner();
                        }}
                        style={{ padding: 4 }}
                    >
                        <Ionicons name="refresh-outline" size={22} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                }
            />

            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                {/* Header Context Subtitle */}
                <View style={styles.topContextBar}>
                    <Text style={styles.topContextText}>
                        {count.category_name} • {count.counted_by_name || "Unassigned"}
                    </Text>
                </View>

                {/* Success Toast Banner (Screenshot 5 style) */}
                {successBanner && (
                    <View style={styles.successBanner}>
                        <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                        <Text style={styles.successBannerText}>{successBanner}</Text>
                    </View>
                )}

                {/* Tabs: Scanner | List (N) */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === "SCANNER" && styles.tabActive]}
                        onPress={() => setActiveTab("SCANNER")}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === "SCANNER" && styles.tabTextActive,
                            ]}
                        >
                            Scanner
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === "LIST" && styles.tabActive]}
                        onPress={() => setActiveTab("LIST")}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === "LIST" && styles.tabTextActive,
                            ]}
                        >
                            List ({items.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Main Content Area */}
                {activeTab === "SCANNER" ? (
                    <View style={styles.scannerTabContent}>
                        {/* Camera Scanner */}
                        <BarcodeScanner
                            ref={scannerRef}
                            height={220}
                            isActive={activeTab === "SCANNER"}
                            onBarcodeScanned={(barcode) => handleBarcodeLookup(barcode)}
                        />

                        {/* Manual SKU / Barcode Entry */}
                        <View style={styles.manualEntrySection}>
                            <Text style={styles.manualEntryLabel}>Manual Barcode / SKU Entry</Text>
                            <View style={styles.manualInputRow}>
                                <TextInput
                                    style={[globalStyles.textInput, styles.manualInput]}
                                    placeholder="Enter UPC or SKU number..."
                                    placeholderTextColor={COLORS.placeholder}
                                    value={manualBarcode}
                                    onChangeText={setManualBarcode}
                                    keyboardType="numeric"
                                    onSubmitEditing={() => handleBarcodeLookup(manualBarcode)}
                                    returnKeyType="done"
                                />
                                <TouchableOpacity
                                    style={[
                                        styles.manualAddBtn,
                                        (!manualBarcode.trim() || isSaving) && { opacity: 0.6 },
                                    ]}
                                    disabled={!manualBarcode.trim() || isSaving}
                                    onPress={() => handleBarcodeLookup(manualBarcode)}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                        <Text style={styles.manualAddBtnText}>Add</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.instructionsContainer}>
                            <Ionicons name="scan-outline" size={28} color={COLORS.inactiveTint} />
                            <Text style={styles.instructionsText}>
                                Point the camera at a barcode or enter SKU above to record items.
                            </Text>
                        </View>
                    </View>
                ) : (
                    <FlatList
                        data={items}
                        keyExtractor={(item) => item.count_item_id.toString()}
                        renderItem={renderListItem}
                        contentContainerStyle={styles.listContent}
                    />
                )}

                {/* Bottom Bar: "Send for Approval" or "Done" */}
                <View style={styles.bottomBar}>
                    <TouchableOpacity
                        style={globalStyles.buttonPrimary}
                        activeOpacity={0.85}
                        onPress={() =>
                            router.replace({
                                pathname:
                                    "/(app)/(tabs)/home/actions/back_room/CycleCountDetail",
                                params: { id: count.count_id },
                            })
                        }
                    >
                        <Text style={globalStyles.buttonTextPrimary}>Review & Send for Approval</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </TopSafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    topContextBar: {
        backgroundColor: COLORS.surface,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    topContextText: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    successBanner: {
        backgroundColor: "#2E7D32",
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 16,
        gap: 8,
    },
    successBannerText: {
        color: "#FFFFFF",
        fontWeight: "600",
        fontSize: 13,
        flex: 1,
    },
    tabContainer: {
        flexDirection: "row",
        backgroundColor: COLORS.surface,
        borderBottomWidth: 2,
        borderBottomColor: COLORS.border,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    tabActive: {
        borderBottomColor: COLORS.textPrimary,
    },
    tabText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    tabTextActive: {
        color: COLORS.textPrimary,
    },
    scannerTabContent: {
        flex: 1,
    },
    manualEntrySection: {
        backgroundColor: COLORS.surface,
        padding: 16,
        marginTop: 8,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
    },
    manualEntryLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textSecondary,
        marginBottom: 8,
    },
    manualInputRow: {
        flexDirection: "row",
        gap: 10,
    },
    manualInput: {
        flex: 1,
        height: 46,
        paddingVertical: 0,
    },
    manualAddBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    manualAddBtnText: {
        color: "#FFF",
        fontWeight: "700",
        fontSize: 14,
    },
    instructionsContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 32,
        paddingHorizontal: 24,
        gap: 8,
    },
    instructionsText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        textAlign: "center",
        lineHeight: 18,
    },
    listContent: {
        padding: 14,
        paddingBottom: 90,
        gap: 12,
    },
    listItemCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    listItemTop: {
        flexDirection: "row",
        marginBottom: 12,
    },
    productIconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: "#F5F5F5",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    listItemInfo: {
        flex: 1,
    },
    listItemName: {
        fontSize: 14,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginBottom: 3,
    },
    listItemSub: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    metricsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 4,
    },
    metricBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#F9FAFB",
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    metricLabel: {
        fontSize: 10,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    metricValExpected: {
        fontSize: 12,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    metricValScanned: {
        fontSize: 12,
        fontWeight: "800",
    },
    varianceBadge: {
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 6,
        borderWidth: 1,
    },
    varianceBadgeText: {
        fontSize: 10,
        fontWeight: "700",
    },
    stepperRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F5F5F5",
        borderRadius: 8,
        padding: 4,
    },
    stepperBtn: {
        width: 48,
        height: 38,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#E0E0E0",
        borderRadius: 6,
    },
    stepperValueContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    stepperValue: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    bottomBar: {
        backgroundColor: COLORS.surface,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
});
