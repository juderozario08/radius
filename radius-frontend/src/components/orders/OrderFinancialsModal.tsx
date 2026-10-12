import { DetailRow } from "@/components/common/DetailRow";
import { COLORS } from "@/constants/colors";
import { FONT_SIZE, globalStyles, SPACING } from "@/constants/styles";
import { OnlineOrder } from "@/types/order.types";
import { formatMoney } from "@/utils/money";
import { Ionicons } from "@expo/vector-icons";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
    order: OnlineOrder;
    visible: boolean;
    onClose: () => void;
};

export function OrderFinancialsModal({ order, visible, onClose }: Props) {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={globalStyles.modalOverlay}>
                <View style={[globalStyles.modalContentWrapper, styles.wrapper]}>
                    <View style={styles.body}>
                        <View style={styles.header}>
                            <Text style={styles.title}>Order Breakdown</Text>
                            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close order breakdown">
                                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {order.shipping_address ? (
                                <View style={styles.shipping}>
                                    <Text style={styles.sectionTitle}>Shipping</Text>
                                    <DetailRow label="Address:" value={order.shipping_address} />
                                    <DetailRow label="Carrier:" value={order.carrier || "Standard"} />
                                    <DetailRow label="Tracking:" value={order.tracking_number || "N/A"} />
                                </View>
                            ) : null}

                            <Text style={styles.sectionTitle}>Financials</Text>
                            <DetailRow label="Subtotal:" value={formatMoney(order.subtotal)} />
                            <DetailRow label="Tax:" value={formatMoney(order.tax_amount)} />
                            <DetailRow label="Shipping Fee:" value={formatMoney(order.shipping_fee)} />
                            <DetailRow label="Discount:" value={formatMoney(order.discount_total)} />
                            <View style={globalStyles.divider} />
                            <DetailRow label="Total Amount:" value={formatMoney(order.total_amount)} />
                        </ScrollView>

                        <TouchableOpacity style={[globalStyles.buttonSecondary, styles.closeButton]} onPress={onClose}>
                            <Text style={globalStyles.buttonTextSecondary}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    wrapper: { maxHeight: "80%" },
    body: { padding: SPACING.xl },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: SPACING.md,
    },
    title: { fontSize: FONT_SIZE.xl, fontWeight: "700", color: COLORS.textPrimary },
    shipping: { marginBottom: SPACING.lg },
    sectionTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginTop: SPACING.smd,
        marginBottom: SPACING.xsm,
    },
    closeButton: { marginTop: SPACING.lg },
});
