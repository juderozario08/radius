import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Image } from "react-native";
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
import { ProductPlanogram } from "@/components/inventory/ProductPlanogram";
import { useAuth } from "@/hooks/useAuth";
import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";

type TabName = "Details" | "Protection" | "Locations" | "Planogram";

export default function ProductScreen() {
    const { productId } = useLocalSearchParams();
    const { logout } = useAuth();

    const [details, setDetails] = useState<ProductScreenDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabName>("Details");

    useEffect(() => {
        if (productId) {
            fetchProductDetails();
        }
    }, [productId]);

    const fetchProductDetails = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Updated endpoint
            const endpoint = `/api/sales_floor/inventory/product-details?product_id=${productId}`;
            const data = await callApi<ProductScreenDetails>(endpoint, { method: "GET" }, logout);
            if (data) {
                setDetails(data);
            } else {
                setError("Product not found");
            }
        } catch (err: any) {
            setError(err.message || "Failed to load product");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveLocations = async (updatedLocations: MimsLocationItem[]) => {
        if (!details) return;
        setIsLoading(true);
        try {
            const endpoint = `/api/sales_floor/inventory/locations/sync`;
            await callApi(endpoint, {
                method: "PUT",
                body: {
                    inventory_id: details.inventory.inventory_id,
                    locations: updatedLocations,
                }
            }, logout);
            
            Toast.show({ type: "success", text1: "Locations updated successfully!" });
            await fetchProductDetails();
        } catch (err: any) {
            Toast.show({ type: "error", text1: "Failed to sync locations", text2: err.message });
            setIsLoading(false);
        }
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
                    inventoryId={details.inventory.inventory_id}
                    productId={details.product.product_id}
                    onSave={handleSaveLocations}
                />;
            case "Planogram":
                return <ProductPlanogram planogram={details.planogram_info} />;
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
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : error || !details ? (
                <View style={globalStyles.centerElement}>
                    <Text style={globalStyles.errorText}>{error || "Product not found"}</Text>
                </View>
            ) : (
                <View style={styles.contentContainer}>
                    {/* Header Details */}
                    <View style={styles.headerInfo}>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerSubtitle}>SKU:<Text style={{ fontWeight: "700" }}>{details.product.sku}</Text></Text>
                            <Text style={styles.headerSubtitle}>UPC:<Text style={{ fontWeight: "700" }}>{details.product.upc}</Text></Text>
                            <Text style={styles.headerTitle}>{details.product.name}</Text>
                            <View style={styles.priceRow}>
                                <Text style={styles.price}>${details.product.retail_price.toFixed(2)}</Text>
                                {details.product.constrained_end_after && (
                                    <Text style={styles.constrainedText}>Constrained SKU End After: {new Date(details.product.constrained_end_after).toLocaleDateString()}</Text>
                                )}
                            </View>
                        </View>
                        {/* Placeholder for Product Image */}
                        <View style={styles.imagePlaceholder}>
                            <Image 
                                source={require('@/assets/images/favicon.png')} 
                                style={{ width: 40, height: 40, opacity: 0.5 }} 
                                resizeMode="contain"
                            />
                        </View>
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabsContainer}>
                        {(["Details", "Protection", "Locations", "Planogram"] as TabName[]).map(tab => (
                            <TouchableOpacity 
                                key={tab} 
                                style={[styles.tab, activeTab === tab && styles.activeTab]}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Tab Content */}
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
        padding: 16,
        backgroundColor: COLORS.headerBackground,
        flexDirection: "row",
        justifyContent: "space-between",
    },
    headerTextContainer: {
        flex: 1,
        marginRight: 16,
    },
    headerSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginTop: 4,
        marginBottom: 8,
    },
    priceRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
    },
    price: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.success,
        marginRight: 8,
    },
    constrainedText: {
        fontSize: 12,
        color: COLORS.error,
        fontWeight: "600",
    },
    imagePlaceholder: {
        width: 60,
        height: 60,
        backgroundColor: "rgba(0,0,0,0.05)",
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    tabsContainer: {
        flexDirection: "row",
        backgroundColor: "rgba(0,0,0,0.05)",
        marginHorizontal: 16,
        borderRadius: 8,
        padding: 4,
        marginBottom: 16,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: "center",
        borderRadius: 6,
    },
    activeTab: {
        backgroundColor: COLORS.surface,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 13,
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
