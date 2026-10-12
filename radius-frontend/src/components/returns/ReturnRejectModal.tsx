import { COLORS } from "@/constants/colors";
import { FONT_SIZE, globalStyles, RADIUS, SPACING } from "@/constants/styles";
import { useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

type Props = {
    returnId: number | null;
    isProcessing: boolean;
    onClose: () => void;
    onReject: (returnId: number, reason: string) => Promise<void>;
};

export function ReturnRejectModal({ returnId, isProcessing, onClose, onReject }: Props) {
    const [reason, setReason] = useState("");

    const close = () => {
        setReason("");
        onClose();
    };

    const reject = async () => {
        if (returnId === null || isProcessing) return;
        await onReject(returnId, reason.trim() || "Manager rejected");
        close();
    };

    return (
        <Modal visible={returnId !== null} transparent animationType="fade" onRequestClose={close}>
            <View style={globalStyles.modalOverlay}>
                <View style={[globalStyles.modalContentWrapper, styles.content]}>
                    <Text style={styles.title}>Reject Return #{returnId}</Text>
                    <Text style={styles.description}>Enter a reason for rejection:</Text>
                    <TextInput
                        style={styles.input}
                        value={reason}
                        onChangeText={setReason}
                        placeholder="Manager rejected"
                        placeholderTextColor={COLORS.textMuted}
                        multiline
                        accessibilityLabel="Rejection reason"
                    />
                    <View style={styles.actions}>
                        <TouchableOpacity style={[globalStyles.buttonSecondary, styles.action]} onPress={close}>
                            <Text style={globalStyles.buttonTextSecondary}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[globalStyles.buttonPrimary, styles.action]} disabled={isProcessing} onPress={reject}>
                            <Text style={globalStyles.buttonTextPrimary}>Reject Return</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    content: { maxWidth: 420, padding: SPACING.xl },
    title: { fontSize: FONT_SIZE.xl, fontWeight: "700", color: COLORS.textPrimary },
    description: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, marginTop: SPACING.sm },
    input: {
        marginTop: SPACING.lg,
        minHeight: 80,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        borderRadius: RADIUS.md,
        color: COLORS.textPrimary,
        backgroundColor: COLORS.inputBg,
        textAlignVertical: "top",
    },
    actions: { flexDirection: "row", gap: SPACING.md, marginTop: SPACING.lg },
    action: { flex: 1 },
});
