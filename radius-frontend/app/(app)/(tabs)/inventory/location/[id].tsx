import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import HeaderComponent from "@/components/common/HeaderComponent";
import { BarcodeScanner, BarcodeScannerRef } from "@/components/common/BarcodeScanner";
import { SwipeableTopTabs } from "@/components/common/SwipeableTopTabs";
import { ProductAdjusterCard } from "@/components/inventory/ProductAdjusterCard";
import { BinActionToggle } from "@/components/inventory/BinActionToggle";
import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";
import { ENDPOINTS } from "@/constants/routes";
import { callApi } from "@/utils/helpers";
import { useAuth } from "@/hooks/useAuth";
import { MimsProductInventory, LocationProductsResponse } from "@/types/inventory.types";

const SCANNER_HEIGHT = Math.round(Dimensions.get("window").height * 0.5);

export default function LocationDetailScreen() {
    const { id } = useLocalSearchParams();
    const locationId = id as string;
    const { logout } = useAuth();
    const scannerRef = useRef<BarcodeScannerRef>(null);

    const [action, setAction] = useState<"IN" | "OUT">("IN");
    const [scannedProduct, setScannedProduct] = useState<MimsProductInventory | null>(null);
    const [products, setProducts] = useState<MimsProductInventory[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);

    useEffect(() => {
        validateAndFetchLocation();
    }, []);

    const validateAndFetchLocation = async () => {
        setIsLoading(true);
        const endpoint = `${ENDPOINTS.AUTHENTICATED.MIMS.getLocationProducts}?location_id=${encodeURIComponent(locationId)}`;
        const response = await callApi<LocationProductsResponse>(endpoint, { method: "GET" }, logout);

        if (!response) {
            setLocationError("Failed to load this bin location.");
        } else if (response.message === "Bin location does not exist") {
            setLocationError("Bin location does not exist.");
        } else if (response.products) {
            setProducts(response.products);
        }
        setIsLoading(false);
    };

    const fetchProductsByLocation = async () => {
        if (locationError) return;
        setIsLoading(true);
        const endpoint = `${ENDPOINTS.AUTHENTICATED.MIMS.getLocationProducts}?location_id=${encodeURIComponent(locationId)}`;
        const response = await callApi<LocationProductsResponse>(endpoint, { method: "GET" }, logout);
        setProducts(response?.products ?? []);
        setIsLoading(false);
    };

    const handleBarcodeScanned = async (barcode: string) => {
        setIsLoading(true);
        const response = await callApi<MimsProductInventory>(ENDPOINTS.AUTHENTICATED.MIMS.binItem, {
            method: "POST",
            body: JSON.stringify({ barcode, location_id: locationId, action }),
        }, logout);

        if (response) {
            setScannedProduct(response);
            Toast.show({ type: "success", text1: "Success", text2: `Product binned ${action.toLowerCase()} successfully.` });
            fetchProductsByLocation();
        } else {
            setScannedProduct(null);
        }
        setIsLoading(false);
    };

    const handleUpdateQuantity = async (productId: number, newQuantity: number) => {
        const result = await callApi(ENDPOINTS.AUTHENTICATED.MIMS.updateQuantity, {
            method: "POST",
            body: JSON.stringify({ product_id: productId, quantity: newQuantity }),
        }, logout);

        if (result !== null) {
            if (scannedProduct?.product_id === productId) {
                setScannedProduct({ ...scannedProduct, on_hand_qty: newQuantity });
            }
            setProducts(products.map(p => p.product_id === productId ? { ...p, on_hand_qty: newQuantity } : p));
            Toast.show({ type: "success", text1: "Updated", text2: "Quantity updated successfully." });
        }
    };

    const handleScanAgain = () => {
        scannerRef.current?.resetScanner();
        setScannedProduct(null);
    };

    return (
        <TopSafeAreaView style={styles.container}>
            <HeaderComponent
                headerLeft={
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                }
                headerCenter={<Text style={globalStyles.headerTitle}>Bin {locationId}</Text>}
            />

            {locationError ? (
                <LocationErrorView message={locationError} />
            ) : (
                <SwipeableTopTabs
                    tabs={[
                        {
                            name: "SCAN",
                            children: () => (
                                <ScanTabContent
                                    action={action}
                                    onActionChange={setAction}
                                    scannedProduct={scannedProduct}
                                    isLoading={isLoading}
                                    onUpdateQuantity={handleUpdateQuantity}
                                />
                            ),
                        },
                        {
                            name: "LIST",
                            children: () => (
                                <ListTabContent
                                    products={products}
                                    isLoading={isLoading}
                                    onUpdateQuantity={handleUpdateQuantity}
                                    onRefresh={fetchProductsByLocation}
                                />
                            ),
                        },
                    ]}
                    renderAboveContent={() => (
                        <BarcodeScanner
                            ref={scannerRef}
                            onBarcodeScanned={handleBarcodeScanned}
                            height={SCANNER_HEIGHT}
                        />
                    )}
                />
            )}

        </TopSafeAreaView>
    );
}

function LocationErrorView({ message }: { message: string }) {
    return (
        <View style={[globalStyles.centerElement, { flex: 1 }]}>
            <Ionicons name="warning" size={64} color={COLORS.danger} />
            <Text style={styles.errorTitle}>{message}</Text>
            <Text style={styles.errorSubtitle}>Please go back and enter a valid bin location.</Text>
        </View>
    );
}

function ScanTabContent({
    action,
    onActionChange,
    scannedProduct,
    isLoading,
    onUpdateQuantity,
}: {
    action: "IN" | "OUT";
    onActionChange: (action: "IN" | "OUT") => void;
    scannedProduct: MimsProductInventory | null;
    isLoading: boolean;
    onUpdateQuantity: (productId: number, newQuantity: number) => void;
}) {
    return (
        <KeyboardAvoidingView style={styles.tabContainer} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <BinActionToggle action={action} onActionChange={onActionChange} />
            <View style={styles.contentContainer}>
                {isLoading ? (
                    <View style={globalStyles.centerElement}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Processing...</Text>
                    </View>
                ) : scannedProduct ? (
                    <ProductAdjusterCard product={scannedProduct} onUpdateQuantity={onUpdateQuantity} />
                ) : (
                    <View style={globalStyles.centerElement}>
                        <Ionicons name="barcode-outline" size={64} color={COLORS.border} />
                        <Text style={styles.instructionText}>
                            Scan a product to {action === "IN" ? "add to" : "remove from"} this bin.
                        </Text>
                    </View>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

function ListTabContent({
    products,
    isLoading,
    onUpdateQuantity,
    onRefresh,
}: {
    products: MimsProductInventory[];
    isLoading: boolean;
    onUpdateQuantity: (productId: number, newQuantity: number) => void;
    onRefresh: () => void;
}) {
    const isFocused = useIsFocused();

    useEffect(() => {
        if (isFocused) onRefresh();
    }, [isFocused]);

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
            <View style={[styles.contentContainer, { borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
                {isLoading ? (
                    <View style={globalStyles.centerElement}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Loading location...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={products}
                        keyExtractor={(item) => item.product_id.toString()}
                        renderItem={({ item }) => <ProductAdjusterCard product={item} onUpdateQuantity={onUpdateQuantity} />}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        ListEmptyComponent={<Text style={globalStyles.emptyText}>No products found at this location.</Text>}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.headerBackground,
    },
    backButton: {
        padding: 8,
    },
    tabContainer: {
        flex: 1,
        backgroundColor: COLORS.headerBackground,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: COLORS.headerBackground,
        padding: 16,
    },
    loadingText: {
        marginTop: 10,
        color: COLORS.textSecondary,
    },
    instructionText: {
        marginTop: 12,
        color: COLORS.textSecondary,
        fontSize: 15,
        textAlign: "center",
    },
    errorTitle: {
        fontSize: 20,
        color: COLORS.danger,
        fontWeight: "bold",
        marginTop: 16,
    },
    errorSubtitle: {
        color: COLORS.textSecondary,
        marginTop: 8,
        textAlign: "center",
        marginHorizontal: 20,
    },
});
