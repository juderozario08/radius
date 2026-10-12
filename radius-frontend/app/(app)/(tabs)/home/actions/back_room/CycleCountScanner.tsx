import React, { useEffect, useState, useCallback, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import HeaderComponent from "@/components/common/HeaderComponent";
import BackButton from "@/components/common/BackButton";
import { BarcodeScanner, BarcodeScannerRef } from "@/components/common/BarcodeScanner";
import { ENDPOINTS } from "@/constants/routes";
import { COLORS } from "@/constants/colors";
import { globalStyles, SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";
import { useAuth } from "@/hooks/useAuth";
import { callApi } from "@/utils/helpers";
import { router, useLocalSearchParams } from "expo-router";
import {
    CycleCountItemDetail,
    CycleCountDetailResponse,
} from "@/types/cyclecount.types";
import { Ionicons } from "@expo/vector-icons";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";

type ScannerTab = "SCANNER" | "LIST";

export default function CycleCountScanner() {
    const { logout } = useAuth();
    const params = useLocalSearchParams();
    const countId = typeof params.id === "string" ? Number(params.id) : NaN;
    const validCountId = Number.isInteger(countId) && countId > 0;

    const scannerRef = useRef<BarcodeScannerRef>(null);

    const [detail, setDetail] = useState<CycleCountDetailResponse | null>(null);
    const [activeTab, setActiveTab] = useState<ScannerTab>("SCANNER");
    const [isLoading, setIsLoading] = useState(validCountId);
    const [isSaving, setIsSaving] = useState(false);
    const [manualBarcode, setManualBarcode] = useState("");
    const [successBanner, setSuccessBanner] = useState<string | null>(null);

    const fetchDetail = useCallback(async () => {
        if (!validCountId) {
            setIsLoading(false);
            return;
        }
        const data = await callApi<CycleCountDetailResponse>(
            ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.getDetail(countId),
            { method: "GET" },
            logout
        );
        if (data) {
            setDetail(data);
        }
        setIsLoading(false);
    }, [countId, validCountId, logout]);

    const retryInitialLoad = () => {
        setIsLoading(true);
        fetchDetail();
    };

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    const handleBarcodeLookup = async (barcodeToSearch: string) => {
        const query = barcodeToSearch.trim();
        if (!query || !detail || isSaving) return;

        setIsSaving(true);
        const updatedItem = await callApi<CycleCountItemDetail>(
            ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.scan(countId),
            {
                method: "POST",
                body: JSON.stringify({
                    barcode: query,
                }),
            },
            logout
        );

        if (updatedItem) {
            scannerRef.current?.triggerSuccess();
            setDetail((prev) => {
                if (!prev) return prev;
                const exists = prev.items.some((i) => i.product_id === updatedItem.product_id);
                let newItems: CycleCountItemDetail[];
                if (exists) {
                    newItems = prev.items.map((i) =>
                        i.product_id === updatedItem.product_id ? updatedItem : i
                    );
                } else {
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

            setTimeout(() => {
                setSuccessBanner(null);
            }, 4000);
        } else {
            scannerRef.current?.triggerError();
        }
        setIsSaving(false);
    };

    const handleStepperAdjust = async (item: CycleCountItemDetail, delta: number) => {
        const newQty = Math.max(0, item.counted_qty + delta);
        if (newQty === item.counted_qty) return;

        setIsSaving(true);
        const res = await callApi(
            ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.scan(countId),
            {
                method: "POST",
                body: JSON.stringify({
                    product_id: item.product_id,
                    counted_qty: newQty,
                }),
            },
            logout
        );
        setIsSaving(false);
        if (res === null) return;

        setDetail((prev) => {
            if (!prev) return prev;
            const updatedItems = prev.items.map((i) =>
                i.product_id === item.product_id
                    ? { ...i, counted_qty: newQty, variance: newQty - i.expected_qty }
                    : i
            );
            return { ...prev, items: updatedItems };
        });
    };

    const renderListItem = ({ item }: { item: CycleCountItemDetail }) => {
        const isMatched = item.counted_qty === item.expected_qty && item.counted_qty > 0;
        const isDiscrepancy = item.counted_qty > 0 && item.variance !== 0;

        let badgeBg = COLORS.background;
        let badgeBorder = COLORS.inputBorder;
        let badgeColor = COLORS.textSecondary;

        if (isMatched) {
            badgeBg = COLORS.activeBg;
            badgeBorder = COLORS.successBorder;
            badgeColor = COLORS.success;
        } else if (isDiscrepancy) {
            badgeBg = item.variance < 0 ? COLORS.inactiveBg : COLORS.tealBg;
            badgeBorder = item.variance < 0 ? COLORS.dangerBorder : COLORS.tealBorder;
            badgeColor = item.variance < 0 ? COLORS.error : COLORS.tealDark;
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
                    {isLoading ? (
                        <LoadingSpinner />
                    ) : (
                        <ErrorMessage
                            message={validCountId ? "Couldn't load this cycle count." : "Invalid cycle count ID."}
                            onRetry={validCountId ? retryInitialLoad : undefined}
                        />
                    )}
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
                        style={{ padding: SPACING.xs }}
                    >
                        <Ionicons name="refresh-outline" size={22} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                }
            />

            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <View style={styles.topContextBar}>
                    <Text style={styles.topContextText}>
                        {count.category_name} • {count.counted_by_name || "Unassigned"}
                    </Text>
                </View>

                {successBanner && (
                    <View style={styles.successBanner}>
                        <Ionicons name="checkmark-circle" size={18} color={COLORS.surface} />
                        <Text style={styles.successBannerText}>{successBanner}</Text>
                    </View>
                )}

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

                {activeTab === "SCANNER" ? (
                    <View style={styles.scannerTabContent}>
                        <BarcodeScanner
                            ref={scannerRef}
                            height={220}
                            isActive={activeTab === "SCANNER"}
                            onBarcodeScanned={(barcode) => handleBarcodeLookup(barcode)}
                        />

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
                                        <ActivityIndicator size="small" color={COLORS.surface} />
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
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.smd,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    topContextText: {
        fontSize: FONT_SIZE.md,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    successBanner: {
        backgroundColor: COLORS.success,
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: SPACING.smd,
        paddingHorizontal: SPACING.lg,
        gap: SPACING.sm,
    },
    successBannerText: {
        color: COLORS.surface,
        fontWeight: "600",
        fontSize: FONT_SIZE.smd,
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
        paddingVertical: SPACING.md,
        alignItems: "center",
        justifyContent: "center",
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    tabActive: {
        borderBottomColor: COLORS.textPrimary,
    },
    tabText: {
        fontSize: FONT_SIZE.mdl,
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
        padding: SPACING.lg,
        marginTop: SPACING.sm,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
    },
    manualEntryLabel: {
        fontSize: FONT_SIZE.smd,
        fontWeight: "600",
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
    },
    manualInputRow: {
        flexDirection: "row",
        gap: SPACING.smd,
    },
    manualInput: {
        flex: 1,
        height: 46,
        paddingVertical: 0,
    },
    manualAddBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.xl,
        borderRadius: RADIUS.md,
        justifyContent: "center",
        alignItems: "center",
    },
    manualAddBtnText: {
        color: COLORS.surface,
        fontWeight: "700",
        fontSize: FONT_SIZE.md,
    },
    instructionsContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: SPACING.xxxl,
        paddingHorizontal: SPACING.xxl,
        gap: SPACING.sm,
    },
    instructionsText: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textSecondary,
        textAlign: "center",
        lineHeight: 18,
    },
    listContent: {
        padding: SPACING.mdl,
        paddingBottom: 90,
        gap: SPACING.md,
    },
    listItemCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.mdl,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    listItemTop: {
        flexDirection: "row",
        marginBottom: SPACING.md,
    },
    productIconWrapper: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.background,
        justifyContent: "center",
        alignItems: "center",
        marginRight: SPACING.md,
    },
    listItemInfo: {
        flex: 1,
    },
    listItemName: {
        fontSize: FONT_SIZE.md,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginBottom: SPACING.micro,
    },
    listItemSub: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xxs,
    },
    metricsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.sm,
        marginTop: SPACING.xs,
    },
    metricBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xs,
        backgroundColor: COLORS.surfaceCool,
        paddingVertical: SPACING.xxs,
        paddingHorizontal: SPACING.xsm,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    metricLabel: {
        fontSize: FONT_SIZE.xxs,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    metricValExpected: {
        fontSize: FONT_SIZE.sm,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    metricValScanned: {
        fontSize: FONT_SIZE.sm,
        fontWeight: "800",
    },
    varianceBadge: {
        paddingVertical: SPACING.xxs,
        paddingHorizontal: SPACING.xsm,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
    },
    varianceBadgeText: {
        fontSize: FONT_SIZE.xxs,
        fontWeight: "700",
    },
    stepperRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.md,
        padding: SPACING.xs,
    },
    stepperBtn: {
        width: 48,
        height: 38,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.inputBorder,
        borderRadius: RADIUS.sm,
    },
    stepperValueContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    stepperValue: {
        fontSize: FONT_SIZE.xl,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    bottomBar: {
        backgroundColor: COLORS.surface,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
});
