import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import HeaderComponent from "@/components/common/HeaderComponent";
import BackButton from "@/components/common/BackButton";
import Toast from "react-native-toast-message";
import { ENDPOINTS } from "@/constants/routes";
import { callApi } from "@/utils/helpers";
import { ProductScreenDetails, MimsLocationItem } from "@/types/inventory.types";
import { ProductDetails } from "@/components/inventory/ProductDetails";
import { ProductLocations } from "@/components/inventory/ProductLocations";
import { useAuth } from "@/hooks/useAuth";
import { COLORS } from "@/constants/colors";
import { globalStyles, SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { formatMoney } from "@/utils/money";

type TabName = "Details" | "Protection" | "Locations";

export default function ProductScreen() {
    const { productId } = useLocalSearchParams();
    const { logout } = useAuth();

    const [details, setDetails] = useState<ProductScreenDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabName>("Details");

    const fetchProductDetails = useCallback(async () => {
        if (!productId || typeof productId !== "string") return;
        setIsLoading(true);
        setError(null);
        const endpoint = ENDPOINTS.SALES_FLOOR.INVENTORY.productDetails(productId);
        const data = await callApi<ProductScreenDetails>(endpoint, { method: "GET" }, logout);
        if (data) {
            setDetails(data);
        } else {
            setError("Product not found");
        }
        setIsLoading(false);
    }, [productId, logout]);

    useEffect(() => {
        void fetchProductDetails();
    }, [fetchProductDetails]);

    const handleSaveLocations = async (updatedLocations: MimsLocationItem[]) => {
        if (!details) return;
        setIsLoading(true);
        const res = await callApi(ENDPOINTS.SALES_FLOOR.INVENTORY.syncLocations, {
            method: "PUT",
            body: {
                inventory_id: details.inventory.inventory_id,
                locations: updatedLocations,
            }
        }, logout);
        if (res === null) {
            setIsLoading(false);
            return;
        }

        Toast.show({ type: "success", text1: "Locations updated successfully!" });
        await fetchProductDetails();
    };

    const renderTabContent = () => {
        if (!details) return null;
        switch (activeTab) {
            case "Details":
                return <ProductDetails details={details} />;
            case "Locations":
                return <ProductLocations
                    locations={details.locations}
                    onHandQty={details.inventory.on_hand_qty}
                    sellableQty={details.inventory.open_box_qty + details.inventory.new_qty}
                    inventoryId={details.inventory.inventory_id}
                    productId={details.product.product_id}
                    onSave={handleSaveLocations}
                />;
            case "Protection":
                return <View style={globalStyles.centerElement}><Text>Protection info not available</Text></View>;
            default:
                return null;
        }
    };

    return (
        <TopSafeAreaView style={[globalStyles.container, { backgroundColor: COLORS.headerBackground }]}>
            <HeaderComponent
                headerLeft={<BackButton />}
            />
            {isLoading ? (
                <View style={globalStyles.centerElement}>
                    <LoadingSpinner />
                </View>
            ) : error || !details ? (
                <View style={globalStyles.centerElement}>
                    <Text style={globalStyles.errorText}>{error || "Product not found"}</Text>
                </View>
            ) : (
                <View style={styles.contentContainer}>
                    <View style={styles.headerInfo}>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerSubtitle}>SKU:<Text style={{ fontWeight: "700" }}>{details.product.sku}</Text></Text>
                            <Text style={styles.headerSubtitle}>UPC:<Text style={{ fontWeight: "700" }}>{details.product.upc}</Text></Text>
                            <Text style={styles.headerTitle}>{details.product.name}</Text>
                            <View style={styles.priceRow}>
                                <Text style={styles.price}>{formatMoney(details.product.retail_price)}</Text>
                                {details.product.constrained_end_after && (
                                    <Text style={styles.constrainedText}>Constrained SKU End After: {new Date(details.product.constrained_end_after).toLocaleDateString()}</Text>
                                )}
                            </View>
                        </View>
                        <View style={styles.imagePlaceholder}>
                            <Image
                                source={require('@/assets/images/favicon.png')}
                                style={{ width: 40, height: 40, opacity: 0.5 }}
                                resizeMode="contain"
                            />
                        </View>
                    </View>

                    <View style={styles.tabsContainer}>
                        {(["Details", "Protection", "Locations"] as TabName[]).map(tab => (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.tab, activeTab === tab && styles.activeTab]}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.tabContentArea}>
                        {renderTabContent()}
                    </View>
                </View>
            )}
        </TopSafeAreaView>
    );
}

const styles = StyleSheet.create({
    contentContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    headerInfo: {
        padding: SPACING.lg,
        backgroundColor: COLORS.headerBackground,
        flexDirection: "row",
        justifyContent: "space-between",
    },
    headerTextContainer: {
        flex: 1,
        marginRight: SPACING.lg,
    },
    headerSubtitle: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
    headerTitle: {
        fontSize: FONT_SIZE.lg,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginTop: SPACING.xs,
        marginBottom: SPACING.sm,
    },
    priceRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
    },
    price: {
        fontSize: FONT_SIZE.xl,
        fontWeight: "700",
        color: COLORS.success,
        marginRight: SPACING.sm,
    },
    constrainedText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.error,
        fontWeight: "600",
    },
    imagePlaceholder: {
        width: 60,
        height: 60,
        backgroundColor: COLORS.blackAlpha05,
        borderRadius: RADIUS.md,
        alignItems: "center",
        justifyContent: "center",
    },
    tabsContainer: {
        flexDirection: "row",
        backgroundColor: COLORS.blackAlpha05,
        marginHorizontal: SPACING.lg,
        borderRadius: RADIUS.md,
        padding: SPACING.xs,
        marginBottom: SPACING.lg,
    },
    tab: {
        flex: 1,
        paddingVertical: SPACING.sm,
        alignItems: "center",
        borderRadius: RADIUS.sm,
    },
    activeTab: {
        backgroundColor: COLORS.surface,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: FONT_SIZE.smd,
        fontWeight: "500",
        color: COLORS.textSecondary,
    },
    activeTabText: {
        color: COLORS.textPrimary,
        fontWeight: "700",
    },
    tabContentArea: {
        flex: 1,
    },
});
