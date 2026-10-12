import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { CameraView } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useCameraPermission } from "@/hooks/useBarcode";
import { COLORS } from "@/constants/colors";
import { globalStyles, SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const DEFAULT_CAMERA_HEIGHT = Math.round(SCREEN_HEIGHT * 0.4);
const DUPLICATE_COOLDOWN_MS = 2500;

const SUPPORTED_BARCODE_TYPES: (
    "upc_a" | "upc_e" | "ean13" | "ean8" | "code128" | "code39" | "codabar"
)[] = ["upc_a", "upc_e", "ean13", "ean8", "code128", "code39", "codabar"];

export interface BarcodeScannerRef {
    resetScanner: () => void;
    triggerSuccess: (durationMs?: number) => void;
    triggerError: (durationMs?: number) => void;
    pause?: () => void;
    resume?: () => void;
}

interface BarcodeScannerProps {
    onBarcodeScanned: (barcode: string) => void;
    isActive?: boolean;
    height?: number;
    duplicateCooldownMs?: number;
}

function sanitizeBarcode(raw: string): string | null {
    if (!raw) return null;
    const cleaned = raw.replace(/[\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/g, "").trim();
    if (cleaned.length < 3 || cleaned.length > 64) return null;
    if (/[\x00-\x1F<>{}\\]/.test(cleaned)) return null;
    return cleaned;
}

export const BarcodeScanner = forwardRef<BarcodeScannerRef, BarcodeScannerProps>(
    ({ onBarcodeScanned, isActive = true, height = DEFAULT_CAMERA_HEIGHT, duplicateCooldownMs = DUPLICATE_COOLDOWN_MS }, ref) => {
        const hasPermission = useCameraPermission();
        const isFocused = useIsFocused();

        const [scanStatus, setScanStatus] = useState<"idle" | "success" | "error">("idle");
        const [torch, setTorch] = useState(false);
        const [snapMode, setSnapMode] = useState(false);
        const [manualSnapTrigger, setManualSnapTrigger] = useState(false);

        const lastScannedBarcode = useRef<string | null>(null);
        const lastScanTime = useRef<number>(0);
        const lastAnyScanTime = useRef<number>(0);
        const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
        const statusResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

        useEffect(() => {
            return () => {
                if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
                if (statusResetTimer.current) clearTimeout(statusResetTimer.current);
            };
        }, []);

        useEffect(() => {
            if (isFocused) {
                setScanStatus("idle");
                lastScannedBarcode.current = null;
                lastScanTime.current = 0;
                lastAnyScanTime.current = 0;
            }
        }, [isFocused]);

        const triggerSuccess = useCallback((durationMs = 1200) => {
            if (statusResetTimer.current) clearTimeout(statusResetTimer.current);
            setScanStatus("success");
            statusResetTimer.current = setTimeout(() => {
                setScanStatus("idle");
            }, durationMs);
        }, []);

        const triggerError = useCallback((durationMs = 1500) => {
            if (statusResetTimer.current) clearTimeout(statusResetTimer.current);
            setScanStatus("error");
            statusResetTimer.current = setTimeout(() => {
                setScanStatus("idle");
            }, durationMs);
        }, []);

        const resetScanner = useCallback(() => {
            if (statusResetTimer.current) clearTimeout(statusResetTimer.current);
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
            setScanStatus("idle");
            lastScannedBarcode.current = null;
            lastScanTime.current = 0;
            lastAnyScanTime.current = 0;
            setManualSnapTrigger(false);
        }, []);

        useImperativeHandle(ref, () => ({
            resetScanner,
            triggerSuccess,
            triggerError,
            pause: () => {},
            resume: () => {},
        }));

        const handleBarcode = useCallback((result: { type: string; data: string }) => {
            if (!result?.data) return;

            const sanitized = sanitizeBarcode(result.data);
            if (!sanitized) return;

            if (snapMode && !manualSnapTrigger) return;
            if (snapMode) setManualSnapTrigger(false);

            const now = Date.now();

            if (inactivityTimer.current) {
                clearTimeout(inactivityTimer.current);
            }
            inactivityTimer.current = setTimeout(() => {
                lastScannedBarcode.current = null;
            }, 2000);

            if (lastScannedBarcode.current === sanitized && now - lastScanTime.current < duplicateCooldownMs) {
                return;
            }

            lastScannedBarcode.current = sanitized;
            lastScanTime.current = now;
            lastAnyScanTime.current = now;

            onBarcodeScanned(sanitized);
        }, [snapMode, manualSnapTrigger, onBarcodeScanned, duplicateCooldownMs]);

        const scannerIsActive = isActive && isFocused;

        if (!scannerIsActive) {
            return (
                <View style={[styles.cameraWrapper, { height }]}>
                    <View style={styles.cameraContainer} />
                </View>
            );
        }

        return (
            <View style={[styles.cameraWrapper, { height }]}>
                <View style={styles.cameraContainer}>
                    {hasPermission === null ? (
                        <View style={globalStyles.centerElement}>
                            <LoadingSpinner />
                        </View>
                    ) : hasPermission === false ? (
                        <View style={globalStyles.centerElement}>
                            <Text>No access to camera</Text>
                        </View>
                    ) : (
                        <View style={styles.cameraInner}>
                            <CameraView
                                style={StyleSheet.absoluteFillObject}
                                enableTorch={torch}
                                onBarcodeScanned={handleBarcode}
                                barcodeScannerSettings={{ barcodeTypes: SUPPORTED_BARCODE_TYPES }}
                            />

                            <View style={styles.scannerOverlay} pointerEvents="none">
                                <View
                                    style={[
                                        styles.scannerReticle,
                                        scanStatus === "success" && styles.reticleSuccess,
                                        scanStatus === "error" && styles.reticleError,
                                    ]}
                                >
                                    {scanStatus === "success" && (
                                        <Ionicons name="checkmark-circle" size={48} color={COLORS.successBright} />
                                    )}
                                    {scanStatus === "error" && (
                                        <Ionicons name="close-circle" size={48} color={COLORS.dangerBright} />
                                    )}
                                </View>
                            </View>

                            <View style={styles.cameraTopControls}>
                                <TouchableOpacity
                                    style={styles.controlIcon}
                                    onPress={() => setTorch(!torch)}
                                    activeOpacity={0.7}
                                    accessibilityRole="button"
                                    accessibilityLabel={torch ? "Turn off flashlight" : "Turn on flashlight"}
                                    accessibilityState={{ selected: torch }}
                                >
                                    <Ionicons name={torch ? "flash" : "flash-off"} size={22} color="white" />
                                </TouchableOpacity>
                            </View>

                            {snapMode && (
                                <View style={styles.snapBtnContainer}>
                                    <TouchableOpacity
                                        style={styles.snapButtonOuter}
                                        onPress={() => setManualSnapTrigger(true)}
                                        accessibilityRole="button"
                                        accessibilityLabel="Scan barcode now"
                                    >
                                        <View style={styles.snapButtonInner} />
                                    </TouchableOpacity>
                                </View>
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
                        accessibilityRole="switch"
                        accessibilityLabel="Snap Mode"
                        accessibilityState={{ checked: snapMode }}
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
        backgroundColor: COLORS.black,
        overflow: "hidden",
    },
    cameraInner: {
        flex: 1,
        overflow: "hidden",
        borderRadius: RADIUS.lg,
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
        borderColor: COLORS.whiteAlpha50,
        borderRadius: RADIUS.xl,
        justifyContent: "center",
        alignItems: "center",
    },
    reticleSuccess: {
        borderColor: COLORS.successBright,
        borderWidth: 3,
        backgroundColor: COLORS.successOverlay,
    },
    reticleError: {
        borderColor: COLORS.dangerBright,
        borderWidth: 3,
        backgroundColor: COLORS.dangerOverlay,
    },
    cameraTopControls: {
        position: "absolute",
        top: 16,
        right: 16,
        flexDirection: "row",
        gap: SPACING.md,
        zIndex: 10,
    },
    controlIcon: {
        backgroundColor: COLORS.overlay,
        width: 40,
        height: 40,
        borderRadius: RADIUS.xxl,
        justifyContent: "center",
        alignItems: "center",
    },
    snapBtnContainer: {
        position: "absolute",
        bottom: 16,
        alignSelf: "center",
        zIndex: 10,
    },
    snapButtonOuter: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 4,
        borderColor: "white",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.blackAlpha20,
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
        marginTop: SPACING.md,
        marginRight: SPACING.lg,
        gap: SPACING.md,
    },
    snapModeText: {
        fontSize: FONT_SIZE.md,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    snapModePill: {
        width: 50,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.border,
        padding: SPACING.xxs,
        justifyContent: "center",
    },
    snapModePillActive: {
        backgroundColor: COLORS.primary,
    },
    snapModeKnob: {
        width: 24,
        height: 24,
        borderRadius: RADIUS.lg,
        backgroundColor: "white",
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        elevation: 2,
    },
    snapModeKnobActive: {
        transform: [{ translateX: 22 }],
    },
});

BarcodeScanner.displayName = "BarcodeScanner";
