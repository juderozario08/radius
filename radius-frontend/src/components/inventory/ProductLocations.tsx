import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert } from "react-native";
import { MimsLocationItem } from "@/types/inventory.types";
import { COLORS } from "@/constants/colors";
import { globalStyles, SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";
import { ENDPOINTS } from "@/constants/routes";
import { Ionicons } from "@expo/vector-icons";
import { LocationInput } from "@/components/common/LocationInput";
import { BarcodeScanner, BarcodeScannerRef } from "@/components/common/BarcodeScanner";
import { useAuth } from "@/hooks/useAuth";
import { callApi } from "@/utils/helpers";
import Toast from "react-native-toast-message";

interface ProductLocationsProps {
    locations: MimsLocationItem[];
    onHandQty: number;
    sellableQty: number;
    inventoryId: number;
    productId: number;
    onSave?: (locations: MimsLocationItem[]) => void;
}

const CARD_MIN_HEIGHT = 56;

export const ProductLocations: React.FC<ProductLocationsProps> = ({
    locations, onHandQty, sellableQty, inventoryId, productId, onSave,
}) => {
    const { logout } = useAuth();

    const ensureUnbinned = (locs: MimsLocationItem[], onHand: number) => {
        const hasUnbinned = locs.some(loc => loc.location_type === 'UNBINNED');
        if (!hasUnbinned) {
            const binnedQty = locs.reduce((sum, loc) => sum + loc.quantity, 0);
            const calculatedUnbinnedQty = Math.max(0, onHand - binnedQty);

            return [
                {
                    mims_location_id: null,
                    store_id: locs.length > 0 ? locs[0].store_id : 0,
                    inventory_id: locs.length > 0 ? locs[0].inventory_id : 0,
                    quantity: calculatedUnbinnedQty,
                    location_type: 'UNBINNED' as const
                },
                ...locs
            ];
        }
        return locs;
    };

    const [locsState, setLocsState] = useState<MimsLocationItem[]>(ensureUnbinned(locations || [], onHandQty));
    const [committedLocs, setCommittedLocs] = useState<MimsLocationItem[]>(ensureUnbinned(locations || [], onHandQty));
    const [activeFromIndex, setActiveFromIndex] = useState<number | null>(null);

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [newLocationId, setNewLocationId] = useState("");
    const scannerRef = useRef<BarcodeScannerRef>(null);

    const [isAdjusting, setIsAdjusting] = useState(false);
    const [adjustedQty, setAdjustedQty] = useState(onHandQty);

    useEffect(() => {
        const withUnbinned = ensureUnbinned(locations || [], onHandQty);
        setLocsState(withUnbinned);
        setCommittedLocs(withUnbinned);
        setActiveFromIndex(null);
        setIsModalVisible(false);
        setNewLocationId("");
        setIsAdjusting(false);
        setAdjustedQty(onHandQty);
    }, [locations, onHandQty]);

    const hasChanges = locsState.length !== committedLocs.length || locsState.some((loc, i) => loc.quantity !== committedLocs[i]?.quantity);

    const handleMove = (fromIdx: number, toIdx: number) => {
        setLocsState(prev => {
            const next = [...prev];
            if (next[fromIdx].quantity > 0) {
                next[fromIdx] = { ...next[fromIdx], quantity: next[fromIdx].quantity - 1 };
                next[toIdx] = { ...next[toIdx], quantity: next[toIdx].quantity + 1 };
            }
            return next;
        });
    };

    const handleCancel = () => {
        setLocsState(committedLocs);
        setActiveFromIndex(null);
    };

    const handleDone = () => {
        if (onSave) {
            onSave(locsState);
        }
    };

    const formatLocationId = (raw: string): string => {
        const digits = raw.replace(/\D/g, '').slice(0, 9);
        if (digits.length !== 9) return '';
        return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 9)}`;
    };

    const handleBarcodeScanned = (barcode: string) => {
        const digits = barcode.replace(/\D/g, '').slice(0, 9);
        setNewLocationId(digits);
        if (digits.length === 9) {
            scannerRef.current?.triggerSuccess();
        } else {
            scannerRef.current?.triggerError();
        }
    };

    const handleAddLocation = async () => {
        const formattedId = formatLocationId(newLocationId);
        if (!formattedId) {
            Alert.alert("Invalid Location", "Please enter a valid 9-digit bin location.");
            return;
        }

        const exists = locsState.some(loc => loc.mims_location_id === formattedId);
        if (exists) {
            Toast.show({ type: "info", text1: "Location already exists" });
            setIsModalVisible(false);
            setNewLocationId("");
            return;
        }

        const res = await callApi(ENDPOINTS.SALES_FLOOR.INVENTORY.createLocation, {
            method: "POST",
            body: { location_id: formattedId },
        }, logout);
        setIsModalVisible(false);
        setNewLocationId("");
        if (res === null) return;

        const newLoc: MimsLocationItem = {
            mims_location_id: formattedId,
            store_id: locsState.length > 0 ? locsState[0].store_id : 0,
            inventory_id: locsState.length > 0 ? locsState[0].inventory_id : 0,
            quantity: 0,
            location_type: 'OVERSTOCK'
        };

        setLocsState(prev => [...prev, newLoc]);
        Toast.show({ type: "success", text1: "Location added" });
    };

    const handleAdjustSubmit = async () => {
        if (adjustedQty === onHandQty) {
            setIsAdjusting(false);
            return;
        }

        const res = await callApi(ENDPOINTS.SALES_FLOOR.INVENTORY.adjustments, {
            method: "POST",
            body: {
                inventory_id: inventoryId,
                product_id: productId,
                previous_qty: onHandQty,
                adjusted_qty: adjustedQty,
                reason: "",
            },
        }, logout);
        if (res === null) return;

        Toast.show({ type: "success", text1: "Adjustment submitted for review" });
        setIsAdjusting(false);
    };

    const handleAdjustCancel = () => {
        setAdjustedQty(onHandQty);
        setIsAdjusting(false);
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.sectionTitle}>From: </Text>
                    <Ionicons name="enter-outline" size={20} color={COLORS.textSecondary} style={{ transform: [{ rotateY: '180deg' }] }} />
                </View>
                <View style={{ flexDirection: 'row', gap: SPACING.smd }}>
                    <Text style={styles.sectionValue}>On hand: {onHandQty}</Text>
                    <Text style={styles.sectionValue}>Sellable: {sellableQty}</Text>
                </View>
            </View>

            <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>Zone</Text>
                <Text style={styles.listHeaderText}>Aisle</Text>
                <Text style={styles.listHeaderText}>Section</Text>
                <Text style={styles.listHeaderText}>Level/Bin</Text>
            </View>

            {locsState.map((loc, i) => {
                const isActive = activeFromIndex === i;
                return (
                    <TouchableOpacity
                        key={`from_${i}`}
                        style={[
                            styles.locationCard,
                            isActive && styles.locationCardActive
                        ]}
                        onPress={() => setActiveFromIndex(isActive ? null : i)}
                    >
                        <View>
                            <Text style={styles.locTitle}>
                                {loc.location_type === 'UNBINNED' ? 'Unbinned' : 'Overstock'} ({loc.quantity})
                            </Text>
                            {loc.mims_location_id && (
                                <Text style={styles.locSubtitle}>{loc.mims_location_id}</Text>
                            )}
                        </View>
                    </TouchableOpacity>
                );
            })}

            <View style={[styles.sectionHeader, { marginTop: SPACING.xxl }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.sectionTitle}>To: </Text>
                    <Ionicons name="enter-outline" size={20} color={COLORS.textSecondary} />
                </View>
                <Text style={styles.sectionValue}>
                    {activeFromIndex !== null ? 'Select destination' : 'Select a "From" location first'}
                </Text>
            </View>

            {locsState.map((loc, i) => {
                const isSame = i === activeFromIndex;
                const isDisabled = activeFromIndex === null || isSame;
                const delta = loc.quantity - (committedLocs[i]?.quantity || 0);

                return (
                    <View key={`to_${i}`} style={[styles.locationCardTo, isDisabled && { opacity: 0.5 }]}>
                        <View>
                            <Text style={styles.locTitleTo}>
                                {loc.location_type === 'UNBINNED' ? 'Unbinned' : 'Overstock'}
                                {delta > 0 && !isSame ? ` (${loc.quantity})` : ''}
                            </Text>
                            {loc.mims_location_id && (
                                <Text style={styles.locSubtitleTo}>{loc.mims_location_id}</Text>
                            )}
                        </View>
                        {!isSame && (
                            <View style={styles.stepper}>
                                <TouchableOpacity
                                    style={styles.stepButton}
                                    onPress={() => !isDisabled && handleMove(i, activeFromIndex!)}
                                    disabled={isDisabled || delta === 0}
                                >
                                    <Ionicons name="remove" size={20} color={COLORS.accent} />
                                </TouchableOpacity>
                                <Text style={styles.stepValue}>{delta}</Text>
                                <TouchableOpacity
                                    style={styles.stepButton}
                                    onPress={() => !isDisabled && handleMove(activeFromIndex!, i)}
                                    disabled={isDisabled || locsState[activeFromIndex!].quantity === 0}
                                >
                                    <Ionicons name="add" size={20} color={COLORS.accent} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                );
            })}

            <TouchableOpacity style={styles.addLocationButton} onPress={() => setIsModalVisible(true)}>
                <Text style={styles.addLocationText}>+ Add New Location</Text>
            </TouchableOpacity>

            <View style={styles.bottomBar}>
                {isAdjusting ? (
                    <View style={styles.adjustContainer}>
                        <Text style={styles.adjustLabel}>Adjust On Hand Quantity</Text>
                        <View style={styles.adjustStepper}>
                            <TouchableOpacity
                                style={styles.adjustStepButton}
                                onPress={() => setAdjustedQty(prev => Math.max(0, prev - 1))}
                                disabled={adjustedQty === 0}
                            >
                                <Ionicons name="remove" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                            <Text style={styles.adjustQtyText}>{adjustedQty}</Text>
                            <TouchableOpacity
                                style={styles.adjustStepButton}
                                onPress={() => setAdjustedQty(prev => prev + 1)}
                            >
                                <Ionicons name="add" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.cancelButton} onPress={handleAdjustCancel}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.doneButton} onPress={handleAdjustSubmit}>
                                <Text style={styles.doneButtonText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : hasChanges ? (
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
                            <Text style={styles.doneButtonText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.adjustButton} onPress={() => setIsAdjusting(true)}>
                        <Ionicons name="cube-outline" size={20} color={COLORS.primary} style={{ marginRight: SPACING.sm }} />
                        <Text style={styles.adjustButtonText}>Adjust Inventory</Text>
                    </TouchableOpacity>
                )}
            </View>

            <Modal
                visible={isModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => { setIsModalVisible(false); setNewLocationId(""); }}
            >
                <View style={globalStyles.modalOverlay}>
                    <View style={globalStyles.modalContentWrapper}>
                        <View style={globalStyles.modalCardContainer}>
                            <View style={globalStyles.modalHeader}>
                                <Text style={globalStyles.modalTitle}>Add Bin Location</Text>
                                <TouchableOpacity onPress={() => { setIsModalVisible(false); setNewLocationId(""); }}>
                                    <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                                </TouchableOpacity>
                            </View>

                            <Text style={globalStyles.modalSubtitle}>Scan a bin location barcode or enter the 9-digit number</Text>

                        <BarcodeScanner
                            ref={scannerRef}
                            onBarcodeScanned={handleBarcodeScanned}
                            height={200}
                        />

                        <View style={globalStyles.modalInputSection}>
                            <Text style={globalStyles.modalInputLabel}>Bin Number</Text>
                            <LocationInput
                                value={newLocationId}
                                onChangeText={setNewLocationId}
                            />
                        </View>

                        <TouchableOpacity style={[globalStyles.buttonPrimary, { marginTop: SPACING.xxl, borderRadius: 24 }]} onPress={handleAddLocation}>
                            <Text style={globalStyles.buttonTextPrimary}>Add</Text>
                        </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        padding: SPACING.lg,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: SPACING.lg,
    },
    sectionTitle: {
        fontSize: FONT_SIZE.lg,
        color: COLORS.textSecondary,
    },
    sectionValue: {
        fontSize: FONT_SIZE.lg,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    listHeader: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginBottom: SPACING.sm,
        paddingRight: SPACING.lg,
        gap: SPACING.md,
    },
    listHeaderText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
    },
    locationCard: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        minHeight: CARD_MIN_HEIGHT,
        marginBottom: SPACING.md,
    },
    locationCardActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.surface,
        borderWidth: 2,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    locTitle: {
        fontSize: FONT_SIZE.mdl,
        fontWeight: "600",
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    locSubtitle: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textSecondary,
    },
    locationCardTo: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: COLORS.accent,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        minHeight: CARD_MIN_HEIGHT,
        marginBottom: SPACING.md,
    },
    locTitleTo: {
        fontSize: FONT_SIZE.mdl,
        fontWeight: "600",
        color: COLORS.primaryText,
        marginBottom: SPACING.xs,
    },
    locSubtitleTo: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.whiteAlpha80,
    },
    stepper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.whiteAlpha20,
        borderRadius: 24,
        padding: SPACING.xs,
    },
    stepButton: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        width: 32,
        height: 32,
        alignItems: "center",
        justifyContent: "center",
    },
    stepValue: {
        color: COLORS.primaryText,
        fontSize: FONT_SIZE.lg,
        fontWeight: "600",
        marginHorizontal: SPACING.lg,
    },
    addLocationButton: {
        alignItems: "center",
        padding: SPACING.lg,
        marginTop: SPACING.sm,
    },
    addLocationText: {
        color: COLORS.primary,
        fontWeight: "600",
        fontSize: FONT_SIZE.mdl,
    },
    bottomBar: {
        marginTop: SPACING.xxl,
        marginBottom: SPACING.huge,
        alignItems: "center",
    },
    adjustButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.whiteAlpha80,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 24,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xxl,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    adjustButtonText: {
        color: COLORS.primary,
        fontWeight: "600",
        fontSize: FONT_SIZE.mdl,
    },
    actionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        paddingHorizontal: SPACING.lg,
        gap: SPACING.lg,
    },
    cancelButton: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 24,
        paddingVertical: SPACING.md,
    },
    cancelButtonText: {
        color: COLORS.textPrimary,
        fontWeight: "600",
        fontSize: FONT_SIZE.mdl,
    },
    doneButton: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.primary,
        borderRadius: 24,
        paddingVertical: SPACING.md,
    },
    doneButtonText: {
        color: COLORS.primaryText,
        fontWeight: "600",
        fontSize: FONT_SIZE.mdl,
    },
    adjustContainer: {
        width: "100%",
        alignItems: "center",
        gap: SPACING.lg,
    },
    adjustLabel: {
        fontSize: FONT_SIZE.lg,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    adjustStepper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.xs,
    },
    adjustStepButton: {
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.xxl,
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    adjustQtyText: {
        fontSize: 24,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginHorizontal: SPACING.xxl,
        minWidth: 48,
        textAlign: "center",
    },
});
