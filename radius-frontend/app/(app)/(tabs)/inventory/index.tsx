import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Image } from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import HeaderComponent from "@/components/common/HeaderComponent";
import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";
import { CameraView, Camera } from "expo-camera";
import { ENDPOINTS } from "@/constants/routes";
import { callApi } from "@/utils/helpers";
import { useAuth } from "@/hooks/useAuth";
import CustomToast from "@/components/common/Toast";
import { MimsProductInventory, ScanProductResponse } from "@/types/inventory.types";
import { ProductDetails } from "@/components/inventory/ProductDetails";
import { Ionicons } from "@expo/vector-icons";
import { createMaterialTopTabNavigator, MaterialTopTabBar } from "@react-navigation/material-top-tabs";
import { useIsFocused } from "@react-navigation/native";
import { LocationInput } from "@/components/common/LocationInput";
import { router } from "expo-router";
import Toast from "react-native-toast-message";

const Tab = createMaterialTopTabNavigator();

const SCREEN_HEIGHT = Dimensions.get("window").height;
const CAMERA_HEIGHT = Math.round(SCREEN_HEIGHT * 0.4);

const CameraSection = ({
    hasPermission,
    isScanning,
    scanned,
    onBarcodeScanned,
    onScanAgain
}: {
    hasPermission: boolean | null;
    isScanning: boolean;
    scanned: boolean;
    onBarcodeScanned: (result: { type: string; data: string }) => void;
    onScanAgain: () => void;
}) => {
    const isFocused = useIsFocused();
    const [torch, setTorch] = useState(false);
    const [snapMode, setSnapMode] = useState(false);
    const [manualSnapTrigger, setManualSnapTrigger] = useState(false);

    if (!isFocused) return (
        <View style={styles.cameraWrapper}>
            <View style={styles.cameraContainer} />
        </View>
    );

    const handleBarcodeWrapper = (res: { type: string; data: string }) => {
        if (snapMode) setManualSnapTrigger(false);
        onBarcodeScanned(res);
    };

    const shouldScan = !scanned && (!snapMode || manualSnapTrigger);

    return (
        <View style={styles.cameraWrapper}>
            <View style={styles.cameraContainer}>
                {hasPermission === null ? (
                    <View style={globalStyles.centerElement}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                ) : hasPermission === false ? (
                    <View style={globalStyles.centerElement}>
                        <Text>No access to camera</Text>
                    </View>
                ) : (
                    <View style={{ flex: 1, overflow: "hidden" }}>
                        {isScanning ? (
                            <CameraView
                                enableTorch={torch}
                                onBarcodeScanned={shouldScan ? handleBarcodeWrapper : undefined}
                                barcodeScannerSettings={{
                                    barcodeTypes: ["upc_a", "upc_e", "ean13", "ean8", "code128", "code39", "codabar"],
                                }}
                            />
                        ) : (
                            <View style={[styles.cameraPaused]}>
                                <Text style={styles.pausedText}>Scanner Paused</Text>
                                <TouchableOpacity style={styles.resumeButton} onPress={onScanAgain}>
                                    <Text style={styles.resumeButtonText}>Tap to Scan Again</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        <View style={styles.scannerOverlay}>
                            <View style={styles.reticleContainer}>
                                <View style={[styles.reticleCorner, styles.cornerTL]} />
                                <View style={[styles.reticleCorner, styles.cornerTR]} />
                                <View style={[styles.reticleCorner, styles.cornerBL]} />
                                <View style={[styles.reticleCorner, styles.cornerBR]} />
                                <View style={styles.reticleDot} />
                            </View>
                        </View>

                        {/* Camera Controls Overlay */}
                        {isScanning && (
                            <>
                                <TouchableOpacity
                                    style={[styles.controlIcon, styles.torchButton]}
                                    onPress={() => setTorch(!torch)}
                                >
                                    <Ionicons name={torch ? "flash" : "flash-off"} size={22} color="white" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.controlIcon, styles.pauseButton]}
                                    onPress={onScanAgain}
                                >
                                    <Ionicons name="pause" size={22} color="white" />
                                </TouchableOpacity>

                                {snapMode && (
                                    <View style={styles.snapBtnContainer}>
                                        <TouchableOpacity
                                            style={styles.snapButtonOuter}
                                            onPress={() => setManualSnapTrigger(true)}
                                        >
                                            <View style={styles.snapButtonInner} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                )}
            </View>

            <View style={styles.snapModeToggleContainer}>
                <Text style={styles.snapModeText}>Snap Mode</Text>
                <TouchableOpacity
                    style={[styles.snapModePill, snapMode && styles.snapModePillActive]}
                    onPress={() => {
                        setSnapMode(!snapMode);
                        setManualSnapTrigger(false);
                    }}>
                    <View style={[styles.snapModeKnob, snapMode && styles.snapModeKnobActive]} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

// --- MIMS Tab Component ---
const MimsTab = ({
    mimsProduct,
    isLoading,
}: any) => {

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.headerBackground }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={styles.contentContainer}>
                {isLoading ? (
                    <View style={globalStyles.centerElement}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={{ marginTop: 10, color: COLORS.textSecondary }}>Fetching data...</Text>
                    </View>
                ) : (
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
                        {mimsProduct ? (
                            <ProductDetails product={mimsProduct} />
                        ) : (
                            <View style={globalStyles.centerElement}>
                                <Ionicons name="barcode-outline" size={64} color={COLORS.border} />
                                <Text style={styles.instructionText}>Point camera at a barcode to scan product.</Text>
                            </View>
                        )}
                    </ScrollView>
                )}
            </View>
        </KeyboardAvoidingView>
    );
};

// --- Location Tab Component ---
const LocationTab = ({
    locationId,
    handleLocationInputChange,
    onSearch,
}: any) => {

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.headerBackground }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={styles.contentContainer}>
                <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
                    <View style={styles.locationInputContainer}>
                        <Text style={styles.inputLabel}>Enter the 9-digit bin number</Text>
                        <View style={{ marginBottom: 24 }}>
                            <LocationInput
                                value={locationId}
                                onChangeText={handleLocationInputChange}
                                onFulfill={() => onSearch(locationId)}
                            />
                        </View>
                        <TouchableOpacity
                            style={styles.searchButton}
                            onPress={() => onSearch(locationId)}
                        >
                            <Text style={styles.searchButtonText}>Search Bin Location</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};


// --- Main Screen ---
export default function MimsScreen() {
    const { logout } = useAuth();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);

    // MIMS Mode State
    const [scannedMims, setScannedMims] = useState(false);
    const [isScanningMims, setIsScanningMims] = useState(true);
    const [mimsProduct, setMimsProduct] = useState<MimsProductInventory | null>(null);
    const [isLoadingMims, setIsLoadingMims] = useState(false);

    // Location Mode State
    const [scannedLocation, setScannedLocation] = useState(false);
    const [isScanningLocation, setIsScanningLocation] = useState(true);
    const [locationId, setLocationId] = useState("");

    useEffect(() => {
        const getCameraPermissions = async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === "granted");
        };
        getCameraPermissions();
    }, []);

    const formatLocationId = (value: string) => {
        // Reconstruct the format XX-XX-XX-XXX from raw digits
        const match = value.match(/^(\d{0,2})(\d{0,2})(\d{0,2})(\d{0,3})$/);
        if (match) {
            let formatted = match[1];
            if (match[2]) formatted += "-" + match[2];
            if (match[3]) formatted += "-" + match[3];
            if (match[4]) formatted += "-" + match[4];
            return formatted;
        }
        return value;
    };

    const handleBarcodeScanned = ({ data }: { type: string; data: string }, mode: "MIMS" | "LOCATION") => {
        if (mode === "MIMS") {
            if (!isScanningMims) return;
            setScannedMims(true);
            setIsScanningMims(false);
            fetchProductByBarcode(data);
        } else {
            if (!isScanningLocation) return;
            setScannedLocation(true);
            setIsScanningLocation(false);
            // For barcode scan, we expect the raw XX-XX-XX-XXX format
            // Clean it to digits only for the state
            const digitsOnly = data.replace(/\D/g, "").slice(0, 9);
            setLocationId(digitsOnly);
            if (digitsOnly.length === 9) {
                handleSearchLocation(digitsOnly);
            }
        }
    };

    const handleScanAgain = (mode: "MIMS" | "LOCATION") => {
        if (mode === "MIMS") {
            setScannedMims(false);
            setIsScanningMims(true);
            setMimsProduct(null);
        } else {
            setScannedLocation(false);
            setIsScanningLocation(true);
        }
    };

    const fetchProductByBarcode = async (barcode: string) => {
        setIsLoadingMims(true);
        try {
            const endpoint = `${ENDPOINTS.AUTHENTICATED.MIMS.scanProduct}?barcode=${encodeURIComponent(barcode)}`;
            const response = await callApi<ScanProductResponse>(endpoint, { method: "GET" }, logout);
            if (response && response.product) {
                setMimsProduct(response.product);
                Toast.show({ type: "success", text1: "Product Scanned", text2: response.message });
            } else {
                setMimsProduct(null);
                Toast.show({ type: "error", text1: "Not Found", text2: "Product not found for this barcode." });
            }
        } catch (error: any) {
            setMimsProduct(null);
            Toast.show({ type: "error", text1: "Error", text2: error.message || "Failed to scan product." });
        } finally {
            setIsLoadingMims(false);
        }
    };

    const handleSearchLocation = (rawId: string) => {
        if (rawId.length !== 9) {
            Toast.show({ type: "error", text1: "Invalid Location", text2: "Location ID must be 9 digits." });
            return;
        }
        const formattedLoc = formatLocationId(rawId);
        router.push(`/inventory/location/${encodeURIComponent(formattedLoc)}`);
    };

    const handleLocationInputChange = (text: string) => {
        setLocationId(text);
    };

    return (
        <TopSafeAreaView style={[globalStyles.container, { backgroundColor: COLORS.headerBackground }]}>
            <HeaderComponent
                headerCenter={<Text style={globalStyles.headerTitle}>MIMS</Text>}
                headerRight={
                    <TouchableOpacity onPress={() => router.push("/(app)/product-search" as any)}>
                        <Image
                            source={require("@/assets/images/search.png")}
                            style={globalStyles.headerImageSize}
                        />
                    </TouchableOpacity>
                }
            />
            <Tab.Navigator
                tabBar={(props) => {
                    const isMims = props.state.index === 0;
                    let touchStartX = 0;
                    return (
                        <View
                            style={{ backgroundColor: COLORS.headerBackground }}
                            onTouchStart={(e) => touchStartX = e.nativeEvent.pageX}
                            onTouchEnd={(e) => {
                                const deltaX = touchStartX - e.nativeEvent.pageX;
                                if (deltaX > 50 && isMims) props.navigation.navigate("LOCATION");
                                if (deltaX < -50 && !isMims) props.navigation.navigate("MIMS");
                            }}
                        >
                            <MaterialTopTabBar {...props} />
                            <CameraSection
                                hasPermission={hasPermission}
                                isScanning={isMims ? isScanningMims : isScanningLocation}
                                scanned={isMims ? scannedMims : scannedLocation}
                                onBarcodeScanned={(result) => handleBarcodeScanned(result, isMims ? "MIMS" : "LOCATION")}
                                onScanAgain={() => handleScanAgain(isMims ? "MIMS" : "LOCATION")}
                            />
                        </View>
                    );
                }}
                screenOptions={{
                    tabBarActiveTintColor: COLORS.textPrimary,
                    tabBarInactiveTintColor: COLORS.textSecondary,
                    tabBarIndicatorStyle: { height: 40, bottom: 3, borderRadius: 8, backgroundColor: "white", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, elevation: 1 },
                    tabBarLabelStyle: { fontWeight: "600", fontSize: 13, textTransform: "none" },
                    tabBarStyle: {
                        backgroundColor: "#EFEFEF",
                        elevation: 0,
                        shadowOpacity: 0,
                        marginHorizontal: 16,
                        marginTop: 4,
                        marginBottom: 8,
                        borderRadius: 12,
                        height: 46,
                    },
                }}
            >
                <Tab.Screen name="MIMS">
                    {(props) => (
                        <MimsTab
                            {...props}
                            hasPermission={hasPermission}
                            isScanning={isScanningMims}
                            scanned={scannedMims}
                            mimsProduct={mimsProduct}
                            isLoading={isLoadingMims}
                            onBarcodeScanned={handleBarcodeScanned}
                            onScanAgain={handleScanAgain}
                        />
                    )}
                </Tab.Screen>
                <Tab.Screen name="LOCATION">
                    {(props) => (
                        <LocationTab
                            {...props}
                            hasPermission={hasPermission}
                            isScanning={isScanningLocation}
                            scanned={scannedLocation}
                            locationId={locationId}
                            handleLocationInputChange={handleLocationInputChange}
                            onSearch={handleSearchLocation}
                            onBarcodeScanned={handleBarcodeScanned}
                            onScanAgain={handleScanAgain}
                        />
                    )}
                </Tab.Screen>
            </Tab.Navigator>
            <CustomToast />
        </TopSafeAreaView>
    );
}

const styles = StyleSheet.create({
    cameraContainer: {
        flex: 1,
        backgroundColor: "#000",
    },
    scannerOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
    },
    reticleContainer: {
        width: 260,
        height: 160,
        justifyContent: "center",
        alignItems: "center",
    },
    reticleCorner: {
        position: "absolute",
        width: 28,
        height: 28,
        borderColor: "#ffffff",
    },
    cornerTL: {
        top: 0,
        left: 0,
        borderTopWidth: 3,
        borderLeftWidth: 3,
        borderTopLeftRadius: 8,
    },
    cornerTR: {
        top: 0,
        right: 0,
        borderTopWidth: 3,
        borderRightWidth: 3,
        borderTopRightRadius: 8,
    },
    cornerBL: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
        borderBottomLeftRadius: 8,
    },
    cornerBR: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        borderBottomRightRadius: 8,
    },
    reticleDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#ffffff",
    },
    cameraPaused: {
        backgroundColor: "rgba(0,0,0,0.7)",
        justifyContent: "center",
        alignItems: "center",
    },
    pausedText: {
        color: "white",
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 16,
    },
    resumeButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    resumeButtonText: {
        color: "white",
        fontWeight: "600",
    },
    contentContainer: {
        flex: 1,
        backgroundColor: COLORS.headerBackground,
        padding: 16,
    },
    instructionText: {
        marginTop: 12,
        color: COLORS.textSecondary,
        fontSize: 15,
        textAlign: "center",
    },
    locationInputContainer: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 15,
        color: COLORS.textSecondary,
        marginBottom: 16,
        fontWeight: "600",
        textAlign: "center",
    },
    inputRow: {
        flexDirection: "row",
        gap: 12,
    },
    locationInput: {
        flex: 1,
        backgroundColor: COLORS.inputBg,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        borderRadius: 8,
        paddingHorizontal: 16,
        fontSize: 18,
        letterSpacing: 2,
        height: 50,
        color: COLORS.textPrimary,
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
    locationItemCard: {
        backgroundColor: COLORS.background,
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    locationItemName: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    locationItemDetails: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: 8,
    },
    locationItemQty: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.activeText,
    },
    cameraWrapper: {
        height: CAMERA_HEIGHT,
        width: "100%",
    },
    controlIcon: {
        position: "absolute",
        backgroundColor: "rgba(0,0,0,0.45)",
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    torchButton: {
        bottom: 16,
        left: 16,
    },
    pauseButton: {
        bottom: 16,
        right: 16,
    },
    snapBtnContainer: {
        position: "absolute",
        bottom: 20,
        alignSelf: "center",
        zIndex: 2,
    },
    snapButtonOuter: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 4,
        borderColor: "white",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.2)",
    },
    snapButtonInner: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: "white",
    },
    snapModeToggleContainer: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        marginTop: 12,
        marginRight: 16,
        gap: 12,
    },
    snapModeText: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    snapModePill: {
        width: 50,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.border,
        padding: 2,
        justifyContent: "center",
    },
    snapModePillActive: {
        backgroundColor: COLORS.primary,
    },
    snapModeKnob: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "white",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        elevation: 2,
    },
    snapModeKnobActive: {
        transform: [{ translateX: 22 }],
    },
});
