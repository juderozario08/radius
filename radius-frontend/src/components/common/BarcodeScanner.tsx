import React, { useState, useImperativeHandle, forwardRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions } from "react-native";
import { CameraView } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useCameraPermission } from "@/hooks/useBarcode";
import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const DEFAULT_CAMERA_HEIGHT = Math.round(SCREEN_HEIGHT * 0.4);

const SUPPORTED_BARCODE_TYPES: (
    "upc_a" | "upc_e" | "ean13" | "ean8" | "code128" | "code39" | "codabar"
)[] = ["upc_a", "upc_e", "ean13", "ean8", "code128", "code39", "codabar"];

export interface BarcodeScannerRef {
    resetScanner: () => void;
}

interface BarcodeScannerProps {
    onBarcodeScanned: (barcode: string) => void;
    isActive?: boolean;
    height?: number;
}

export const BarcodeScanner = forwardRef<BarcodeScannerRef, BarcodeScannerProps>(
    ({ onBarcodeScanned, isActive = true, height = DEFAULT_CAMERA_HEIGHT }, ref) => {
        const hasPermission = useCameraPermission();
        const isFocused = useIsFocused();

        const [scanned, setScanned] = useState(false);
        const [isScanning, setIsScanning] = useState(true);
        const [torch, setTorch] = useState(false);
        const [snapMode, setSnapMode] = useState(false);
        const [manualSnapTrigger, setManualSnapTrigger] = useState(false);

        useImperativeHandle(ref, () => ({
            resetScanner: () => {
                setScanned(false);
                setIsScanning(true);
            },
        }));

        const scannerIsActive = isActive && isFocused;

        if (!scannerIsActive) {
            return (
                <View style={[styles.cameraWrapper, { height }]}>
                    <View style={styles.cameraContainer} />
                </View>
            );
        }

        const handleBarcode = (result: { type: string; data: string }) => {
            if (snapMode) setManualSnapTrigger(false);
            setScanned(true);
            setIsScanning(false);
            onBarcodeScanned(result.data);
        };

        const pauseScanner = () => {
            setScanned(true);
            setIsScanning(false);
        };

        const resumeScanner = () => {
            setScanned(false);
            setIsScanning(true);
        };

        const shouldScan = !scanned && (!snapMode || manualSnapTrigger);

        return (
            <View style={[styles.cameraWrapper, { height }]}>
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
                        <View style={styles.cameraInner}>
                            {isScanning ? (
                                <CameraView
                                    style={StyleSheet.absoluteFillObject}
                                    enableTorch={torch}
                                    onBarcodeScanned={shouldScan ? handleBarcode : undefined}
                                    barcodeScannerSettings={{ barcodeTypes: SUPPORTED_BARCODE_TYPES }}
                                />
                            ) : (
                                <View style={[StyleSheet.absoluteFillObject, styles.cameraPaused]}>
                                    <Text style={styles.pausedText}>Scanner Paused</Text>
                                    <TouchableOpacity style={styles.resumeButton} onPress={resumeScanner}>
                                        <Text style={styles.resumeButtonText}>Tap to Scan Again</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            <View style={styles.scannerOverlay}>
                                <View style={styles.scannerReticle} />
                            </View>

                            {isScanning && (
                                <>
                                    <View style={styles.cameraTopControls}>
                                        <TouchableOpacity style={styles.controlIcon} onPress={() => setTorch(!torch)}>
                                            <Ionicons name={torch ? "flash" : "flash-off"} size={22} color="white" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.controlIcon} onPress={pauseScanner}>
                                            <Ionicons name="pause" size={22} color="white" />
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
                        onPress={() => {
                            setSnapMode(!snapMode);
                            setManualSnapTrigger(false);
                        }}
                    >
                        <View style={[styles.snapModeKnob, snapMode && styles.snapModeKnobActive]} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }
);

const styles = StyleSheet.create({
    cameraWrapper: {
        width: "100%",
    },
    cameraContainer: {
        flex: 1,
        backgroundColor: "#000",
        overflow: "hidden",
    },
    cameraInner: {
        flex: 1,
        overflow: "hidden",
        borderRadius: 12,
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
    cameraTopControls: {
        position: "absolute",
        top: 16,
        right: 16,
        flexDirection: "row",
        gap: 12,
    },
    controlIcon: {
        backgroundColor: "rgba(0,0,0,0.45)",
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
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
