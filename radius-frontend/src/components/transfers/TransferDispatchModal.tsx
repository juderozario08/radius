import { ActionButtonRow } from "@/components/common/ActionButtonRow";
import { transferScreenStyles as styles } from "@/components/transfers/transferScreenStyles";
import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";
import { KeyboardAvoidingView, Modal, Platform, Text, TextInput, View } from "react-native";

type Props = {
    isDispatchModalVisible: boolean;
    setIsDispatchModalVisible: (visible: boolean) => void;
    dispatchTargetId: number | null;
    carrier: string;
    setCarrier: (value: string) => void;
    trackingNumber: string;
    setTrackingNumber: (value: string) => void;
    isDispatching: boolean;
    handleConfirmDispatch: () => Promise<void>;
};

export function TransferDispatchModal({ isDispatchModalVisible, setIsDispatchModalVisible, dispatchTargetId, carrier, setCarrier, trackingNumber, setTrackingNumber, isDispatching, handleConfirmDispatch }: Props) {
    return (
            <Modal
                visible={isDispatchModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsDispatchModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={globalStyles.modalOverlay}
                >
                    <View style={globalStyles.modalContentWrapper}>
                        <View style={globalStyles.modalCardContainer}>
                            <View style={globalStyles.modalHeader}>
                                <Text style={globalStyles.modalName}>Dispatch Transfer #{dispatchTargetId}</Text>
                            </View>
                            <Text style={styles.dispatchSubtitle}>
                                Dispatched items will be marked as in-transit and ready for destination store receiving.
                            </Text>

                            <View style={globalStyles.divider} />

                            <View style={styles.formField}>
                                <Text style={globalStyles.modalInputLabel}>Carrier (Optional)</Text>
                                <TextInput
                                    style={globalStyles.textInput}
                                    placeholder="e.g. FedEx, Purolator, Internal Van"
                                    placeholderTextColor={COLORS.textSecondary}
                                    value={carrier}
                                    onChangeText={setCarrier}
                                />
                            </View>

                            <View style={styles.formField}>
                                <Text style={globalStyles.modalInputLabel}>Tracking Number (Optional)</Text>
                                <TextInput
                                    style={globalStyles.textInput}
                                    placeholder="e.g. TRK-98437291"
                                    placeholderTextColor={COLORS.textSecondary}
                                    value={trackingNumber}
                                    onChangeText={setTrackingNumber}
                                />
                            </View>

                            <View style={globalStyles.divider} />

                            <ActionButtonRow
                                buttons={[
                                    {
                                        key: "back",
                                        label: "Back",
                                        kind: "neutral",
                                        onPress: () => setIsDispatchModalVisible(false),
                                        disabled: isDispatching,
                                    },
                                    {
                                        key: "dispatch-confirm",
                                        label: isDispatching ? "Dispatching..." : "Confirm Dispatch",
                                        kind: "primary",
                                        onPress: handleConfirmDispatch,
                                        loading: isDispatching,
                                    },
                                ]}
                            />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
    );
}
