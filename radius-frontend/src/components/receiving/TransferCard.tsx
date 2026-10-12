import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { StockTransferSummary } from "@/types/receiving.types";
import { COLORS } from "@/constants/colors";
import { globalStyles, SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";

interface TransferCardProps {
    transfer: StockTransferSummary;
    onPress: (transferId: number) => void;
    onQuickReceive?: (transferId: number) => void;
    isReceiving?: boolean;
}

export const TransferCard: React.FC<TransferCardProps> = ({ transfer, onPress, onQuickReceive, isReceiving }) => {
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    return (
        <TouchableOpacity 
            style={[globalStyles.card, { borderLeftColor: transfer.manual_check_required ? COLORS.warningAccent : COLORS.successAccent }]} 
            onPress={() => transfer.manual_check_required ? onPress(transfer.transfer_id) : undefined}
            disabled={!transfer.manual_check_required && !onPress}
        >
            <View style={globalStyles.cardHeader}>
                <View>
                    <Text style={styles.transferId}>Transfer #{transfer.transfer_id}</Text>
                    <Text style={styles.storeName}>From: {transfer.from_store_name}</Text>
                    {isAdmin && <Text style={styles.storeName}>To: {transfer.to_store_name}</Text>}
                </View>
                <View style={[styles.badge, { backgroundColor: transfer.manual_check_required ? COLORS.warningAccent : COLORS.successAccent }]}>
                    <Text style={styles.badgeText}>{transfer.manual_check_required ? "Manual Check" : "Auto Receive"}</Text>
                </View>
            </View>

            <View style={styles.content}>
                <View style={styles.detailItem}>
                    <Ionicons name="cube-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>{transfer.item_count} items</Text>
                </View>

                {!transfer.manual_check_required && (
                    <TouchableOpacity 
                        style={[styles.quickReceiveBtn, isReceiving && styles.quickReceiveBtnDisabled]}
                        onPress={() => onQuickReceive && onQuickReceive(transfer.transfer_id)}
                        disabled={isReceiving}
                    >
                        {isReceiving ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Text style={styles.quickReceiveText}>Receive Transfer</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    transferId: {
        fontSize: FONT_SIZE.xl,
        fontWeight: "bold",
        color: COLORS.textPrimary,
    },
    storeName: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        marginTop: SPACING.xxs,
    },
    badge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.xs,
    },
    badgeText: {
        color: "white",
        fontSize: FONT_SIZE.sm,
        fontWeight: "bold",
    },
    content: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: SPACING.sm,
    },
    detailItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xs,
    },
    detailText: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
    },
    quickReceiveBtn: {
        backgroundColor: COLORS.successAccent,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
    },
    quickReceiveBtnDisabled: {
        opacity: 0.7,
    },
    quickReceiveText: {
        color: 'white',
        fontWeight: 'bold',
    }
});
