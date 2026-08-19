import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Toast from "react-native-toast-message";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import HeaderComponent from "@/components/common/HeaderComponent";
import { BarcodeScanner, BarcodeScannerRef } from "@/components/common/BarcodeScanner";
import { SwipeableTopTabs } from "@/components/common/SwipeableTopTabs";
import { LocationInput } from "@/components/common/LocationInput";
import { ProductDetails } from "@/components/inventory/ProductDetails";
import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";
import { ENDPOINTS } from "@/constants/routes";
import { callApi } from "@/utils/helpers";
import { useAuth } from "@/hooks/useAuth";
import { MimsProductInventory, ScanProductResponse } from "@/types/inventory.types";

export default function MimsScreen() {
    const { logout } = useAuth();
    const scannerRef = useRef<BarcodeScannerRef>(null);

    const [mimsProduct, setMimsProduct] = useState<MimsProductInventory | null>(null);
    const [isLoadingMims, setIsLoadingMims] = useState(false);
    const [locationId, setLocationId] = useState("");
    const [activeTabIndex, setActiveTabIndex] = useState(0);

    const fetchProductByBarcode = async (barcode: string) => {
        setIsLoadingMims(true);
        // Instead of relying solely on the scan endpoint (which returns basic inventory), 
        // we hit the scan endpoint to find the product, then route to the rich product page.
        const endpoint = `${ENDPOINTS.AUTHENTICATED.MIMS.scanProduct}?barcode=${encodeURIComponent(barcode)}`;
        const response = await callApi<ScanProductResponse>(endpoint, { method: "GET" }, logout);

        if (response?.product) {
            Toast.show({ type: "success", text1: "Product Scanned", text2: response.message });
            router.push(`/(app)/product/${response.product.product_id}` as any);
        } else {
            setMimsProduct(null);
            if (response) {
                Toast.show({ type: "error", text1: "Not Found", text2: "Product not found for this barcode." });
            }
        }
        setIsLoadingMims(false);
    };

    const formatLocationId = (rawDigits: string) => {
        const match = rawDigits.match(/^(\d{0,2})(\d{0,2})(\d{0,2})(\d{0,3})$/);
        if (!match) return rawDigits;
        let formatted = match[1];
        if (match[2]) formatted += "-" + match[2];
        if (match[3]) formatted += "-" + match[3];
        if (match[4]) formatted += "-" + match[4];
        return formatted;
    };

    const navigateToLocation = (rawId: string) => {
        if (rawId.length !== 9) {
            Toast.show({ type: "error", text1: "Invalid Location", text2: "Location ID must be 9 digits." });
            return;
        }
        router.push(`/inventory/location/${encodeURIComponent(formatLocationId(rawId))}`);
    };

    const handleBarcodeScanned = (barcode: string) => {
        if (activeTabIndex === 0) {
            fetchProductByBarcode(barcode);
        } else {
            const digitsOnly = barcode.replace(/\D/g, "").slice(0, 9);
            setLocationId(digitsOnly);
            if (digitsOnly.length === 9) navigateToLocation(digitsOnly);
        }
    };

    const handleScanAgain = () => {
        scannerRef.current?.resetScanner();
        if (activeTabIndex === 0) setMimsProduct(null);
    };

    return (
        <TopSafeAreaView style={[globalStyles.container, { backgroundColor: COLORS.headerBackground }]}>
            <HeaderComponent
                headerCenter={<Text style={globalStyles.headerTitle}>MIMS</Text>}
                headerRight={
                    <TouchableOpacity onPress={() => router.push("/(app)/product-search" as any)}>
                        <Image source={require("@/assets/images/search.png")} style={globalStyles.headerImageSize} />
                    </TouchableOpacity>
                }
            />
            <SwipeableTopTabs
                tabs={[
                    {
                        name: "MIMS",
                        children: () => (
                            <MimsTabContent isLoading={isLoadingMims} />
                        ),
                    },
                    {
                        name: "LOCATION",
                        children: () => (
                            <LocationTabContent
                                locationId={locationId}
                                onLocationInputChange={setLocationId}
                                onSearch={navigateToLocation}
                            />
                        ),
                    },
                ]}
                onTabChange={setActiveTabIndex}
                renderAboveContent={() => (
                    <BarcodeScanner
                        ref={scannerRef}
                        onBarcodeScanned={handleBarcodeScanned}
                    />
                )}
            />
        </TopSafeAreaView>
    );
}

function MimsTabContent({ isLoading }: { isLoading: boolean }) {
    return (
        <KeyboardAvoidingView style={styles.tabContainer} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={styles.contentContainer}>
                {isLoading ? (
                    <View style={globalStyles.centerElement}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Fetching data...</Text>
                    </View>
                ) : (
                    <View style={globalStyles.centerElement}>
                        <Ionicons name="barcode-outline" size={64} color={COLORS.border} />
                        <Text style={styles.instructionText}>Point camera at a barcode to scan product.</Text>
                    </View>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

function LocationTabContent({
    locationId,
    onLocationInputChange,
    onSearch,
}: {
    locationId: string;
    onLocationInputChange: (text: string) => void;
    onSearch: (rawId: string) => void;
}) {
    return (
        <KeyboardAvoidingView style={styles.tabContainer} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={styles.contentContainer}>
                <View style={styles.locationFormWrapper}>
                    <View style={styles.locationForm}>
                        <Text style={styles.inputLabel}>Enter the 9-digit bin number</Text>
                        <View style={{ marginBottom: 24 }}>
                            <LocationInput
                                value={locationId}
                                onChangeText={onLocationInputChange}
                            />
                        </View>
                        <TouchableOpacity style={styles.searchButton} onPress={() => onSearch(locationId)}>
                            <Text style={styles.searchButtonText}>Search Bin Location</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
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
    locationFormWrapper: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    locationForm: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 15,
        color: COLORS.textSecondary,
        marginBottom: 16,
        fontWeight: "600",
        textAlign: "center",
    },
    searchButton: {
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
        borderRadius: 8,
        height: 50,
    },
    searchButtonText: {
        color: "white",
        fontWeight: "700",
        fontSize: 16,
    },
});
