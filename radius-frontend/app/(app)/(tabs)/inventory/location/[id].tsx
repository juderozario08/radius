import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import HeaderComponent from "@/components/common/HeaderComponent";
import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";
import { CameraView, Camera } from "expo-camera";
import { ENDPOINTS } from "@/constants/routes";
import { callApi } from "@/utils/helpers";
import { useAuth } from "@/hooks/useAuth";
import CustomToast from "@/components/common/Toast";
import Toast from "react-native-toast-message";
import { MimsProductInventory, LocationProductsResponse } from "@/types/inventory.types";
import { Ionicons } from "@expo/vector-icons";
import { createMaterialTopTabNavigator, MaterialTopTabBar } from "@react-navigation/material-top-tabs";
import { useLocalSearchParams, router } from "expo-router";
import { useIsFocused } from "@react-navigation/native";

const Tab = createMaterialTopTabNavigator();

// --- Reusable Camera Section Component ---
const CameraSection = ({ 
    hasPermission, 
    isScanning, 
    scanned, 
    onBarcodeScanned, 
    onScanAgain 
}: any) => {
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
                    <View style={{ flex: 1, overflow: "hidden", borderRadius: 12 }}>
                        {isScanning ? (
                            <CameraView
                                style={StyleSheet.absoluteFillObject}
                                enableTorch={torch}
                                onBarcodeScanned={shouldScan ? handleBarcodeWrapper : undefined}
                                barcodeScannerSettings={{
                                    barcodeTypes: ["upc_a", "upc_e", "ean13", "ean8", "code128", "code39"],
                                }}
                            />
                        ) : (
                            <View style={[StyleSheet.absoluteFillObject, styles.cameraPaused]}>
                                <Text style={styles.pausedText}>Scanner Paused</Text>
                                <TouchableOpacity style={styles.resumeButton} onPress={onScanAgain}>
                                    <Text style={styles.resumeButtonText}>Tap to Scan Again</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        <View style={styles.scannerOverlay}>
                            <View style={styles.scannerReticle} />
                        </View>
                        
                        {/* Camera Controls Overlay */}
                        {isScanning && (
                            <>
                                <View style={styles.cameraTopControls}>
                                    <TouchableOpacity style={styles.controlIcon} onPress={() => setTorch(!torch)}>
                                        <Ionicons name={torch ? "flash" : "flash-off"} size={24} color="white" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.controlIcon} onPress={onScanAgain}>
                                        <Ionicons name="pause" size={24} color="white" />
                                    </TouchableOpacity>
                                </View>

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
                    onPress={() => { setSnapMode(!snapMode); setManualSnapTrigger(false); }}
                >
                    <View style={[styles.snapModeKnob, snapMode && styles.snapModeKnobActive]} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

// --- Item Card Component ---
const ProductAdjusterCard = ({ item, onUpdateQuantity }: { item: MimsProductInventory, onUpdateQuantity: (id: number, qty: number) => void }) => {
    return (
        <View style={styles.locationItemCard}>
            <Text style={styles.locationItemName}>{item.name}</Text>
            <Text style={styles.locationItemDetails}>SKU: {item.sku} | UPC: {item.upc}</Text>
            <View style={styles.qtyRow}>
                <Text style={styles.locationItemQty}>Store Qty: {item.on_hand_qty}</Text>
                <View style={styles.adjusterControls}>
                    <TouchableOpacity 
                        style={styles.adjustBtn} 
                        onPress={() => onUpdateQuantity(item.product_id, Math.max(0, item.on_hand_qty - 1))}
                    >
                        <Ionicons name="remove" size={20} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.qtyDisplay}>{item.on_hand_qty}</Text>
                    <TouchableOpacity 
                        style={styles.adjustBtn} 
                        onPress={() => onUpdateQuantity(item.product_id, item.on_hand_qty + 1)}
                    >
                        <Ionicons name="add" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

// --- SCAN Tab ---
const ScanTab = ({
    hasPermission,
    isScanning,
    scanned,
    action,
    setAction,
    scannedProduct,
    onBarcodeScanned,
    onScanAgain,
    onUpdateQuantity,
    isLoading
}: any) => {
    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.headerBackground }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={styles.actionToggleContainer}>
                <TouchableOpacity 
                    style={[styles.actionToggleBtn, action === "IN" && styles.actionToggleBtnActiveIn]}
                    onPress={() => setAction("IN")}
                >
                    <Text style={[styles.actionToggleText, action === "IN" && styles.actionToggleTextActive]}>BIN IN</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.actionToggleBtn, action === "OUT" && styles.actionToggleBtnActiveOut]}
                    onPress={() => setAction("OUT")}
                >
                    <Text style={[styles.actionToggleText, action === "OUT" && styles.actionToggleTextActive]}>BIN OUT</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.contentContainer}>
                {isLoading ? (
                    <View style={globalStyles.centerElement}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={{ marginTop: 10, color: COLORS.textSecondary }}>Processing...</Text>
                    </View>
                ) : scannedProduct ? (
                    <ProductAdjusterCard item={scannedProduct} onUpdateQuantity={onUpdateQuantity} />
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
};

// --- LIST Tab ---
const ListTab = ({
    products,
    isLoading,
    onUpdateQuantity,
    fetchProducts
}: any) => {
    const isFocused = useIsFocused();

    useEffect(() => {
        if (isFocused) {
            fetchProducts();
        }
    }, [isFocused]);

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
            <View style={[styles.contentContainer, { borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
                {isLoading ? (
                    <View style={globalStyles.centerElement}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={{ marginTop: 10, color: COLORS.textSecondary }}>Loading location...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={products}
                        keyExtractor={(item) => item.product_id.toString()}
                        renderItem={({ item }) => <ProductAdjusterCard item={item} onUpdateQuantity={onUpdateQuantity} />}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        ListEmptyComponent={<Text style={globalStyles.emptyText}>No products found at this location.</Text>}
                    />
                )}
            </View>
        </View>
    );
};

export default function LocationDetailScreen() {
    const { id } = useLocalSearchParams();
    const locationId = id as string;
    const { logout } = useAuth();

    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const [isScanning, setIsScanning] = useState(true);
    const [action, setAction] = useState<"IN" | "OUT">("IN");
    const [scannedProduct, setScannedProduct] = useState<MimsProductInventory | null>(null);
    
    const [products, setProducts] = useState<MimsProductInventory[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);

    useEffect(() => {
        const getCameraPermissions = async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === "granted");
        };
        getCameraPermissions();
        checkLocationExists();
    }, []);

    const checkLocationExists = async () => {
        setIsLoading(true);
        try {
            const endpoint = `${ENDPOINTS.AUTHENTICATED.MIMS.getLocationProducts}?location_id=${encodeURIComponent(locationId)}`;
            const response = await callApi<LocationProductsResponse>(endpoint, { method: "GET" }, logout);
            if (response && response.message === "Bin location does not exist") {
                setLocationError("Bin location does not exist.");
            } else if (response && response.products) {
                setProducts(response.products);
            }
        } catch (error: any) {
            // handle silently, let ListTab retry
        } finally {
            setIsLoading(false);
        }
    };

    const fetchProductsByLocation = async () => {
        if (locationError) return;
        setIsLoading(true);
        try {
            const endpoint = `${ENDPOINTS.AUTHENTICATED.MIMS.getLocationProducts}?location_id=${encodeURIComponent(locationId)}`;
            const response = await callApi<LocationProductsResponse>(endpoint, { method: "GET" }, logout);
            if (response && response.products) {
                setProducts(response.products);
            } else {
                setProducts([]);
            }
        } catch (error: any) {
            setProducts([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBarcodeScanned = async ({ type, data }: { type: string; data: string }) => {
        if (!isScanning) return;
        setScanned(true);
        setIsScanning(false);
        setIsLoading(true);

        try {
            const endpoint = ENDPOINTS.AUTHENTICATED.MIMS.binItem;
            const response = await callApi<MimsProductInventory>(endpoint, { 
                method: "POST",
                body: JSON.stringify({
                    barcode: data,
                    location_id: locationId,
                    action: action
                })
            }, logout);
            
            if (response) {
                setScannedProduct(response);
                Toast.show({ type: "success", text1: "Success", text2: `Product binned ${action.toLowerCase()} successfully.` });
                // We update products list in the background
                fetchProductsByLocation();
            }
        } catch (error: any) {
            setScannedProduct(null);
            Toast.show({ type: "error", text1: "Error", text2: error.message || "Failed to process bin action." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateQuantity = async (productId: number, qty: number) => {
        try {
            const endpoint = ENDPOINTS.AUTHENTICATED.MIMS.updateQuantity;
            await callApi(endpoint, { 
                method: "POST",
                body: JSON.stringify({
                    product_id: productId,
                    quantity: qty
                })
            }, logout);
            
            // Update local state to reflect change immediately
            if (scannedProduct && scannedProduct.product_id === productId) {
                setScannedProduct({ ...scannedProduct, on_hand_qty: qty });
            }
            setProducts(products.map(p => p.product_id === productId ? { ...p, on_hand_qty: qty } : p));
            Toast.show({ type: "success", text1: "Updated", text2: "Quantity updated successfully." });
        } catch (error: any) {
            Toast.show({ type: "error", text1: "Error", text2: error.message || "Failed to update quantity." });
        }
    };

    const handleScanAgain = () => {
        setScanned(false);
        setIsScanning(true);
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
                <View style={[globalStyles.centerElement, { flex: 1 }]}>
                    <Ionicons name="warning" size={64} color={COLORS.danger} />
                    <Text style={{ fontSize: 20, color: COLORS.danger, fontWeight: "bold", marginTop: 16 }}>
                        {locationError}
                    </Text>
                    <Text style={{ color: COLORS.textSecondary, marginTop: 8, textAlign: "center", marginHorizontal: 20 }}>
                        Please go back and enter a valid bin location.
                    </Text>
                </View>
            ) : (
                <Tab.Navigator
                    tabBar={(props) => {
                        const isScan = props.state.index === 0;
                        let touchStartX = 0;
                        return (
                            <View 
                                style={{ backgroundColor: COLORS.headerBackground }}
                                onTouchStart={(e) => touchStartX = e.nativeEvent.pageX}
                                onTouchEnd={(e) => {
                                    const deltaX = touchStartX - e.nativeEvent.pageX;
                                    if (deltaX > 50 && isScan) props.navigation.navigate("LIST");
                                    if (deltaX < -50 && !isScan) props.navigation.navigate("SCAN");
                                }}
                            >
                                <MaterialTopTabBar {...props} />
                                <CameraSection
                                    hasPermission={hasPermission}
                                    isScanning={isScanning}
                                    scanned={scanned}
                                    onBarcodeScanned={handleBarcodeScanned}
                                    onScanAgain={handleScanAgain}
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
                    <Tab.Screen name="SCAN">
                        {(props) => (
                            <ScanTab
                                {...props}
                                hasPermission={hasPermission}
                                isScanning={isScanning}
                                scanned={scanned}
                                action={action}
                                setAction={setAction}
                                scannedProduct={scannedProduct}
                                onBarcodeScanned={handleBarcodeScanned}
                                onScanAgain={handleScanAgain}
                                onUpdateQuantity={handleUpdateQuantity}
                                isLoading={isLoading}
                            />
                        )}
                    </Tab.Screen>
                    <Tab.Screen name="LIST">
                        {(props) => (
                            <ListTab
                                {...props}
                                products={products}
                                isLoading={isLoading}
                                onUpdateQuantity={handleUpdateQuantity}
                                fetchProducts={fetchProductsByLocation}
                            />
                        )}
                    </Tab.Screen>
                </Tab.Navigator>
            )}
        </TopSafeAreaView>
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
    actionToggleContainer: {
        flexDirection: "row",
        margin: 16,
        backgroundColor: COLORS.inputBg,
        borderRadius: 8,
        padding: 4,
    },
    actionToggleBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: "center",
        borderRadius: 6,
    },
    actionToggleBtnActiveIn: {
        backgroundColor: COLORS.activeText,
    },
    actionToggleBtnActiveOut: {
        backgroundColor: COLORS.danger,
    },
    actionToggleText: {
        fontWeight: "bold",
        color: COLORS.textSecondary,
    },
    actionToggleTextActive: {
        color: "white",
    },
    cameraContainer: {
        flex: 1,
        backgroundColor: "#000",
        overflow: "hidden",
    },
    scannerOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
    },
    scannerReticle: {
        width: 250,
        height: 150,
        borderWidth: 2,
        borderColor: "rgba(255, 255, 255, 0.5)",
        borderRadius: 12,
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
    qtyRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 8,
    },
    locationItemQty: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    adjusterControls: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    adjustBtn: {
        backgroundColor: COLORS.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
    },
    qtyDisplay: {
        fontSize: 16,
        fontWeight: "bold",
        width: 30,
        textAlign: "center",
    },
    cameraWrapper: {
        height: "50%",
        width: "100%",
    },
    cameraTopControls: {
        position: "absolute",
        top: 16,
        right: 16,
        flexDirection: "row",
        gap: 12,
    },
    controlIcon: {
        backgroundColor: "rgba(0,0,0,0.5)",
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: "center",
        alignItems: "center",
    },
    snapBtnContainer: {
        position: "absolute",
        bottom: 24,
        alignSelf: "center",
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
