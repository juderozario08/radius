import { returnScreenStyles as styles } from "@/components/returns/returnScreenStyles";
import { COLORS } from "@/constants/colors";
import { Money, formatMoney } from "@/utils/money";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Text, TouchableOpacity, View } from "react-native";

type SubmittedReturn = { returnId: number; status: string; total: Money };

type Props = {
    submittedReturn: SubmittedReturn | null;
    onClose: () => void;
};

export function ReturnSuccessModal({ submittedReturn, onClose }: Props) {
    return (
        <Modal visible={!!submittedReturn} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.successModalContent}>
                    <Ionicons name="checkmark-circle" size={56} color={COLORS.success} />
                    <Text style={styles.successTitle}>Return Processed</Text>
                    <Text style={styles.successReturnId}>Return #{submittedReturn?.returnId}</Text>
                    <Text style={styles.successAmount}>Refund: {formatMoney(submittedReturn?.total)}</Text>
                    <Text style={styles.successStatus}>Status: {submittedReturn?.status.replace("_", " ")}</Text>
                    {submittedReturn?.status === "PENDING_APPROVAL" && (
                        <Text style={styles.successNote}>This return requires manager approval because the amount exceeds $50.00.</Text>
                    )}
                    <TouchableOpacity style={styles.successButton} onPress={onClose}>
                        <Text style={styles.successButtonText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
