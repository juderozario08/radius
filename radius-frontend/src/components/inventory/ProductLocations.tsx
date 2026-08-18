import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { MimsLocationItem } from "@/types/inventory.types";
import { COLORS } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";

interface ProductLocationsProps {
    locations: MimsLocationItem[];
    onHandQty: number;
    onSave?: (locations: MimsLocationItem[]) => void;
}

export const ProductLocations: React.FC<ProductLocationsProps> = ({ locations, onHandQty, onSave }) => {
    const [locsState, setLocsState] = useState<MimsLocationItem[]>(locations || []);
    const [committedLocs, setCommittedLocs] = useState<MimsLocationItem[]>(locations || []);
    const [activeFromIndex, setActiveFromIndex] = useState<number | null>(null);

    // New state for Add Location input
    const [isAddingLocation, setIsAddingLocation] = useState(false);
    const [newLocationId, setNewLocationId] = useState("");

    useEffect(() => {
        setLocsState(locations || []);
        setCommittedLocs(locations || []);
        setActiveFromIndex(null);
        setIsAddingLocation(false);
        setNewLocationId("");
    }, [locations]);

    const hasChanges = locsState.length !== committedLocs.length || locsState.some((loc, i) => loc.quantity !== committedLocs[i]?.quantity);

    const handleMove = (fromIdx: number, toIdx: number) => {
        setLocsState(prev => {
            const next = [...prev];
            if (next[fromIdx].quantity > 0) {
                // To avoid mutating the objects directly if they are shared
                next[fromIdx] = { ...next[fromIdx], quantity: next[fromIdx].quantity - 1 };
                next[toIdx] = { ...next[toIdx], quantity: next[toIdx].quantity + 1 };
            }
            return next;
        });
    };

    const handleCancel = () => {
        setLocsState(committedLocs);
        setActiveFromIndex(null);
        setIsAddingLocation(false);
        setNewLocationId("");
    };

    const handleAddLocation = () => {
        if (!newLocationId.trim()) return;
        const formattedId = newLocationId.trim().toUpperCase();
        
        const exists = locsState.some(loc => loc.mims_location_id === formattedId);
        if (exists) {
            setIsAddingLocation(false);
            setNewLocationId("");
            return;
        }

        const newLoc: MimsLocationItem = {
            mims_location_id: formattedId,
            store_id: locsState.length > 0 ? locsState[0].store_id : 0, 
            inventory_id: locsState.length > 0 ? locsState[0].inventory_id : 0,
            quantity: 0,
            location_type: 'OVERSTOCK'
        };

        setLocsState([...locsState, newLoc]);
        setIsAddingLocation(false);
        setNewLocationId("");
    };

    const handleDone = () => {
        if (onSave) {
            onSave(locsState);
        }
    };

    // Mocks for UI from the screenshot
    return (
        <ScrollView style={styles.container}>
            <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.sectionTitle}>From: </Text>
                    <Ionicons name="enter-outline" size={20} color={COLORS.textSecondary} style={{ transform: [{ rotateY: '180deg' }] }} />
                </View>
                <Text style={styles.sectionValue}>On hand: {onHandQty}</Text>
            </View>

            <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>Zone</Text>
                <Text style={styles.listHeaderText}>Aisle</Text>
                <Text style={styles.listHeaderText}>Section</Text>
                <Text style={styles.listHeaderText}>Level/Bin</Text>
            </View>

            {/* FROM SECTION */}
            {locsState.map((loc, i) => {
                const isActive = activeFromIndex === i;
                return (
                    <TouchableOpacity 
                        key={`from_${i}`} 
                        style={[styles.locationCard, isActive && styles.locationCardActive]}
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

            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.sectionTitle}>To: </Text>
                    <Ionicons name="enter-outline" size={20} color={COLORS.textSecondary} />
                </View>
                <Text style={styles.sectionValue}>
                    {activeFromIndex !== null ? 'Select destination' : 'Select a "From" location first'}
                </Text>
            </View>

            {/* TO SECTION */}
            {locsState.map((loc, i) => {
                if (i === activeFromIndex) return null; // Can't move to the same location

                return (
                    <View key={`to_${i}`} style={[styles.locationCardTo, activeFromIndex === null && { opacity: 0.5 }]}>
                        <View>
                            <Text style={styles.locTitleTo}>
                                {loc.location_type === 'UNBINNED' ? 'Unbinned' : 'Overstock'}
                            </Text>
                            {loc.mims_location_id && (
                                <Text style={styles.locSubtitleTo}>{loc.mims_location_id}</Text>
                            )}
                        </View>
                        <View style={styles.stepper}>
                            <TouchableOpacity 
                                style={styles.stepButton}
                                onPress={() => activeFromIndex !== null && handleMove(i, activeFromIndex)}
                                disabled={activeFromIndex === null || loc.quantity === 0}
                            >
                                <Ionicons name="remove" size={20} color={COLORS.accent} />
                            </TouchableOpacity>
                            <Text style={styles.stepValue}>{loc.quantity}</Text>
                            <TouchableOpacity 
                                style={styles.stepButton}
                                onPress={() => activeFromIndex !== null && handleMove(activeFromIndex, i)}
                                disabled={activeFromIndex === null || locsState[activeFromIndex].quantity === 0}
                            >
                                <Ionicons name="add" size={20} color={COLORS.accent} />
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            })}

            {isAddingLocation ? (
                <View style={styles.addLocationInputContainer}>
                    <TextInput
                        style={styles.addLocationInput}
                        placeholder="Enter Bin ID (e.g. A-01-01-001)"
                        value={newLocationId}
                        onChangeText={setNewLocationId}
                        autoCapitalize="characters"
                    />
                    <TouchableOpacity style={styles.addLocationConfirmButton} onPress={handleAddLocation}>
                        <Text style={styles.addLocationConfirmText}>Add</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity style={styles.addLocationButton} onPress={() => setIsAddingLocation(true)}>
                    <Text style={styles.addLocationText}>+ Add New Location</Text>
                </TouchableOpacity>
            )}

            <View style={styles.bottomBar}>
                {hasChanges ? (
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
                            <Text style={styles.doneButtonText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.adjustButton}>
                        <Ionicons name="cube-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                        <Text style={styles.adjustButtonText}>Adjust Inventory</Text>
                    </TouchableOpacity>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        padding: 16,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    sectionValue: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    listHeader: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginBottom: 8,
        paddingRight: 16,
        gap: 12,
    },
    listHeaderText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    locationCard: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
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
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    locSubtitle: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    locId: {
        fontSize: 16,
        fontWeight: "500",
        color: COLORS.textPrimary,
        letterSpacing: 1,
    },
    locationCardTo: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: COLORS.accent,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    locTitleTo: {
        fontSize: 15,
        fontWeight: "600",
        color: "#FFF",
        marginBottom: 4,
    },
    locSubtitleTo: {
        fontSize: 13,
        color: "rgba(255,255,255,0.8)",
    },
    stepper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.2)",
        borderRadius: 24,
        padding: 4,
    },
    stepButton: {
        backgroundColor: "#FFF",
        borderRadius: 16,
        width: 32,
        height: 32,
        alignItems: "center",
        justifyContent: "center",
    },
    stepValue: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "600",
        marginHorizontal: 16,
    },
    addLocationButton: {
        alignItems: "center",
        padding: 16,
        marginTop: 8,
    },
    addLocationText: {
        color: COLORS.primary,
        fontWeight: "600",
        fontSize: 15,
    },
    addLocationInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        marginTop: 8,
        gap: 12,
    },
    addLocationInput: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
    },
    addLocationConfirmButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    addLocationConfirmText: {
        color: "#FFF",
        fontWeight: "600",
        fontSize: 15,
    },
    bottomBar: {
        marginTop: 24,
        marginBottom: 40,
        alignItems: "center",
    },
    adjustButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.8)",
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 24,
        paddingVertical: 12,
        paddingHorizontal: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    adjustButtonText: {
        color: COLORS.primary,
        fontWeight: "600",
        fontSize: 15,
    },
    actionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        paddingHorizontal: 16,
        gap: 16,
    },
    cancelButton: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 24,
        paddingVertical: 12,
    },
    cancelButtonText: {
        color: COLORS.textPrimary,
        fontWeight: "600",
        fontSize: 15,
    },
    doneButton: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.primary,
        borderRadius: 24,
        paddingVertical: 12,
    },
    doneButtonText: {
        color: "#FFF",
        fontWeight: "600",
        fontSize: 15,
    },
});
