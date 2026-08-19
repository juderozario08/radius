import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert } from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import HeaderComponent from "@/components/common/HeaderComponent";
import BackButton from "@/components/common/BackButton";
import { ENDPOINTS } from "@/constants/routes";
import { callApi, showToast } from "@/utils/helpers";
import { useAuth } from "@/hooks/useAuth";
import { COLORS } from "@/constants/colors";
import { globalStyles as STYLES } from "@/constants/styles";
import { Ionicons } from "@expo/vector-icons";

// Mappings from the backend
type AdjustmentStatus = "PENDING" | "APPROVED" | "REJECTED" | "WRITE_OFF";

interface PendingAdjustmentDetail {
    adjustment_id: number;
    inventory_id: number;
    product_id: number;
    previous_qty: number;
    adjusted_qty: number;
    reason: string;
    requested_by: string;
    created_at: string;
    name: string;
    sku: string;
    upc: string;
}

interface ReviewAdjustmentItem {
    adjustment_id: number;
    status: AdjustmentStatus;
    adjusted_qty?: number;
    reason?: string;
}

const REASON_CODES = ["Shrink / Theft", "Damaged", "Found", "Store Use", "Code 88", "Other"];

export default function ItemAdjust() {
    const { logout } = useAuth();
    const [loading, setLoading] = useState(true);
    const [adjustments, setAdjustments] = useState<PendingAdjustmentDetail[]>([]);

    // Local edits for quantity and reason, keyed by adjustment_id
    const [editedQty, setEditedQty] = useState<{ [key: number]: number }>({});
    const [editedReason, setEditedReason] = useState<{ [key: number]: string }>({});
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Fetch pending adjustments
    const fetchAdjustments = async () => {
        setLoading(true);
        const res = await callApi<PendingAdjustmentDetail[]>(ENDPOINTS.AUTHENTICATED.MIMS.adjustments, { method: "GET" }, logout);
        if (res) {
            setAdjustments(res);

            // Initialize local edits with the requested values
            const initialQty: { [key: number]: number } = {};
            const initialReason: { [key: number]: string } = {};
            res.forEach(item => {
                initialQty[item.adjustment_id] = item.adjusted_qty;
                initialReason[item.adjustment_id] = item.reason || REASON_CODES[0];
            });
            setEditedQty(initialQty);
            setEditedReason(initialReason);
            setSelectedIds(new Set());
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAdjustments();
    }, []);

    // Handlers for local edits
    const toggleSelection = (id: number) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const selectAll = () => {
        if (selectedIds.size === adjustments.length) {
            setSelectedIds(new Set()); // Deselect all
        } else {
            setSelectedIds(new Set(adjustments.map(a => a.adjustment_id))); // Select all
        }
    };

    const handleQtyChange = (id: number, delta: number) => {
        setEditedQty(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) }));
    };

    const handleQtyInput = (id: number, value: string) => {
        const val = parseInt(value, 10);
        if (!isNaN(val)) {
            setEditedQty(prev => ({ ...prev, [id]: Math.max(0, val) }));
        }
    };

    const handleReasonChange = (id: number, reason: string) => {
        setEditedReason(prev => ({ ...prev, [id]: reason }));
    };

    // Review submission
    const submitReviews = async (reviews: ReviewAdjustmentItem[]) => {
        if (reviews.length === 0) return;

        const res = await callApi<{ message: string }>(ENDPOINTS.AUTHENTICATED.MIMS.adjustmentsReview, {
            method: "POST",
            body: { reviews }
        }, logout);

        if (res) {
            showToast("success", res.message || "Adjustments processed successfully");
            fetchAdjustments();
        }
    };

    // Individual actions
    const processSingle = (id: number, status: AdjustmentStatus) => {
        Alert.alert("Confirm Action", `Are you sure you want to mark this as ${status}?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Confirm",
                onPress: () => submitReviews([{
                    adjustment_id: id,
                    status,
                    adjusted_qty: editedQty[id],
                    reason: editedReason[id]
                }])
            }
        ]);
    };

    // Bulk actions
    const processBulk = (status: AdjustmentStatus) => {
        if (selectedIds.size === 0) {
            showToast("error", "No items selected");
            return;
        }

        const reviews: ReviewAdjustmentItem[] = Array.from(selectedIds).map(id => ({
            adjustment_id: id,
            status,
            adjusted_qty: editedQty[id],
            reason: editedReason[id]
        }));

        Alert.alert("Confirm Bulk Action", `Process ${selectedIds.size} items as ${status}?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Confirm", onPress: () => submitReviews(reviews) }
        ]);
    };

    const renderItem = ({ item }: { item: PendingAdjustmentDetail }) => {
        const isSelected = selectedIds.has(item.adjustment_id);
        const qty = editedQty[item.adjustment_id] ?? 0;
        const reason = editedReason[item.adjustment_id] ?? "";

        return (
            <View style={[STYLES.card, isSelected && styles.cardSelected]}>
                <View style={STYLES.cardHeader}>
                    <TouchableOpacity onPress={() => toggleSelection(item.adjustment_id)} style={styles.checkbox}>
                        <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <View style={styles.productInfo}>
                        <Text style={styles.productName}>{item.name}</Text>
                        <Text style={styles.productSub}>SKU: {item.sku} | UPC: {item.upc}</Text>
                        <Text style={styles.requestedBy}>Requested by: {item.requested_by}</Text>
                    </View>
                </View>

                <View style={styles.editRow}>
                    <View style={styles.qtyContainer}>
                        <Text style={styles.label}>Adjusted Qty</Text>
                        <View style={styles.stepper}>
                            <TouchableOpacity style={styles.stepBtn} onPress={() => handleQtyChange(item.adjustment_id, -1)}>
                                <Ionicons name="remove" size={20} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                            <TextInput
                                style={styles.qtyInput}
                                keyboardType="number-pad"
                                value={qty.toString()}
                                onChangeText={(val) => handleQtyInput(item.adjustment_id, val)}
                            />
                            <TouchableOpacity style={styles.stepBtn} onPress={() => handleQtyChange(item.adjustment_id, 1)}>
                                <Ionicons name="add" size={20} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.previousQty}>Previous: {item.previous_qty}</Text>
                    </View>

                    <View style={styles.reasonContainer}>
                        <Text style={styles.label}>Reason Code</Text>
                        <View style={styles.reasonScrollWrapper}>
                            {REASON_CODES.map(rc => (
                                <TouchableOpacity
                                    key={rc}
                                    style={[styles.reasonBadge, reason === rc && styles.reasonBadgeSelected]}
                                    onPress={() => handleReasonChange(item.adjustment_id, rc)}
                                >
                                    <Text style={[styles.reasonText, reason === rc && styles.reasonTextSelected]}>{rc}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                <View style={styles.actionsRow}>
                    <TouchableOpacity style={[STYLES.buttonPrimary, { paddingHorizontal: 15, paddingVertical: 8, backgroundColor: COLORS.success }]} onPress={() => processSingle(item.adjustment_id, "APPROVED")}>
                        <Text style={STYLES.buttonTextPrimary}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[STYLES.buttonPrimary, { paddingHorizontal: 15, paddingVertical: 8, backgroundColor: COLORS.accent }]} onPress={() => processSingle(item.adjustment_id, "WRITE_OFF")}>
                        <Text style={STYLES.buttonTextPrimary}>Write-off</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[STYLES.buttonPrimary, { paddingHorizontal: 15, paddingVertical: 8, backgroundColor: COLORS.error }]} onPress={() => processSingle(item.adjustment_id, "REJECTED")}>
                        <Text style={STYLES.buttonTextPrimary}>Deny</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={(
                    <View style={{ flexDirection: 'row' }}>
                        <Text style={STYLES.headerTitle}>Item Adjustments</Text>
                    </View>
                )}
                headerRight={(
                    <TouchableOpacity onPress={selectAll} style={{ paddingRight: 15 }}>
                        <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>
                            {selectedIds.size === adjustments.length && adjustments.length > 0 ? "Deselect All" : "Select All"}
                        </Text>
                    </TouchableOpacity>
                )}
            />

            <View style={styles.container}>
                {loading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
                ) : adjustments.length === 0 ? (
                    <Text style={styles.emptyText}>No pending adjustments to review.</Text>
                ) : (
                    <FlatList
                        data={adjustments}
                        keyExtractor={item => item.adjustment_id.toString()}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                    />
                )}
            </View>

            {adjustments.length > 0 && selectedIds.size > 0 && (
                <View style={[styles.bulkFooter, STYLES.shadowLight]}>
                    <Text style={styles.bulkCount}>{selectedIds.size} Selected</Text>
                    <View style={styles.bulkActions}>
                        <TouchableOpacity style={[STYLES.buttonPrimary, { paddingHorizontal: 15, paddingVertical: 10, backgroundColor: COLORS.success }]} onPress={() => processBulk("APPROVED")}>
                            <Text style={STYLES.buttonTextPrimary}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[STYLES.buttonPrimary, { paddingHorizontal: 15, paddingVertical: 10, backgroundColor: COLORS.accent }]} onPress={() => processBulk("WRITE_OFF")}>
                            <Text style={STYLES.buttonTextPrimary}>Write-off</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[STYLES.buttonPrimary, { paddingHorizontal: 15, paddingVertical: 10, backgroundColor: COLORS.error }]} onPress={() => processBulk("REJECTED")}>
                            <Text style={STYLES.buttonTextPrimary}>Deny</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </TopSafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    listContent: {
        padding: 15,
        paddingBottom: 100, // Space for bulk footer
        gap: 15,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        color: COLORS.textSecondary,
        fontSize: 16,
    },
    cardSelected: {
        borderColor: COLORS.primary,
        borderWidth: 2,
    },
    checkbox: {
        marginRight: 10,
        marginTop: 2,
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    productSub: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    requestedBy: {
        fontSize: 12,
        color: COLORS.primary,
        marginTop: 2,
        fontStyle: 'italic',
    },
    editRow: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    qtyContainer: {
        flex: 1,
        marginRight: 15,
    },
    label: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 5,
        fontWeight: '600',
    },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        overflow: 'hidden',
    },
    stepBtn: {
        padding: 10,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyInput: {
        flex: 1,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: 'bold',
        paddingVertical: 8,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: COLORS.border,
    },
    previousQty: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginTop: 5,
        textAlign: 'center'
    },
    reasonContainer: {
        flex: 2,
    },
    reasonScrollWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    reasonBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 15,
        backgroundColor: COLORS.neutralBg,
        borderWidth: 1,
        borderColor: "transparent",
    },
    reasonBadgeSelected: {
        backgroundColor: COLORS.primary + '20', // 20% opacity
        borderColor: COLORS.primary,
    },
    reasonText: {
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    reasonTextSelected: {
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 15,
    },
    bulkFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.surface,
        padding: 15,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 10,
    },
    bulkCount: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    bulkActions: {
        flexDirection: 'row',
        gap: 10,
    }
});
