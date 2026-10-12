import { cycleCountDetailStyles as styles } from "@/components/cycleCount/cycleCountDetailStyles";
import { COLORS } from "@/constants/colors";
import { globalStyles, SPACING } from "@/constants/styles";
import { Employee } from "@/types/admin.types";
import { CycleCountItemDetail } from "@/types/cyclecount.types";
import { Ionicons } from "@expo/vector-icons";
import { Dispatch, SetStateAction } from "react";
import { ActivityIndicator, FlatList, Modal, Text, TextInput, TouchableOpacity, View } from "react-native";

type EditProps = {
    editingItem: CycleCountItemDetail | null;
    setEditingItem: Dispatch<SetStateAction<CycleCountItemDetail | null>>;
    editQty: number;
    setEditQty: Dispatch<SetStateAction<number>>;
    editReason: string;
    setEditReason: Dispatch<SetStateAction<string>>;
    isActionLoading: boolean;
    handleSaveItemQty: () => Promise<void>;
};

export function EditCountItemModal({ editingItem, setEditingItem, editQty, setEditQty, editReason, setEditReason, isActionLoading, handleSaveItemQty }: EditProps) {
    return (
            <Modal
                visible={!!editingItem}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setEditingItem(null)}
            >
                <View style={globalStyles.modalOverlay}>
                    <View style={globalStyles.modalContentWrapper}>
                        <View style={globalStyles.modalCardContainer}>
                            <View style={globalStyles.modalHeader}>
                                <View style={{ flex: 1, marginRight: SPACING.md }}>
                                    <Text style={globalStyles.modalTitle} numberOfLines={2}>
                                        {editingItem?.product_name}
                                    </Text>
                                    <Text style={globalStyles.modalSubtitle}>
                                        Expected in Store: {editingItem?.expected_qty} units
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setEditingItem(null)}>
                                    <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.stepperContainer}>
                                <TouchableOpacity
                                    style={styles.stepperButton}
                                    onPress={() => setEditQty((prev) => Math.max(0, prev - 1))}
                                    accessibilityRole="button"
                                    accessibilityLabel="Decrease counted quantity"
                                >
                                    <Ionicons name="remove" size={24} color={COLORS.textPrimary} />
                                </TouchableOpacity>
                                <View style={styles.stepperValueBox}>
                                    <Text style={styles.stepperValueText}>{editQty}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.stepperButton}
                                    onPress={() => setEditQty((prev) => prev + 1)}
                                    accessibilityRole="button"
                                    accessibilityLabel="Increase counted quantity"
                                >
                                    <Ionicons name="add" size={24} color={COLORS.textPrimary} />
                                </TouchableOpacity>
                            </View>

                            {editQty !== editingItem?.expected_qty && (
                                <View style={styles.reasonInputContainer}>
                                    <Text style={styles.reasonLabel}>Discrepancy Reason (Optional):</Text>
                                    <TextInput
                                        style={globalStyles.textInput}
                                        placeholder="e.g. Damaged stock, Misplaced, Overstock"
                                        placeholderTextColor={COLORS.placeholder}
                                        value={editReason}
                                        onChangeText={setEditReason}
                                    />
                                </View>
                            )}

                            <TouchableOpacity
                                style={[
                                    globalStyles.buttonPrimary,
                                    styles.modalSaveButton,
                                    isActionLoading && { opacity: 0.6 },
                                ]}
                                disabled={isActionLoading}
                                onPress={handleSaveItemQty}
                            >
                                {isActionLoading ? (
                                    <ActivityIndicator size="small" color={COLORS.surface} />
                                ) : (
                                    <Text style={globalStyles.buttonTextPrimary}>Save Count</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
    );
}

type SubmitProps = {
    submitModalVisible: boolean;
    setSubmitModalVisible: Dispatch<SetStateAction<boolean>>;
    submitNotes: string;
    setSubmitNotes: Dispatch<SetStateAction<string>>;
    isActionLoading: boolean;
    handleSubmitForApproval: () => Promise<void>;
};

export function SubmitCycleCountModal({ submitModalVisible, setSubmitModalVisible, submitNotes, setSubmitNotes, isActionLoading, handleSubmitForApproval }: SubmitProps) {
    return (
            <Modal
                visible={submitModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setSubmitModalVisible(false)}
            >
                <View style={globalStyles.modalOverlay}>
                    <View style={globalStyles.modalContentWrapper}>
                        <View style={globalStyles.modalCardContainer}>
                            <View style={globalStyles.modalHeader}>
                                <View>
                                    <Text style={globalStyles.modalTitle}>Submit for Approval</Text>
                                    <Text style={globalStyles.modalSubtitle}>
                                        Send count to store manager for review
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setSubmitModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.reasonInputContainer}>
                                <Text style={styles.reasonLabel}>Notes for Manager (Optional):</Text>
                                <TextInput
                                    style={[globalStyles.textInput, { height: 80, textAlignVertical: "top" }]}
                                    placeholder="e.g. All sections scanned, variance noted on cables"
                                    placeholderTextColor={COLORS.placeholder}
                                    multiline
                                    value={submitNotes}
                                    onChangeText={setSubmitNotes}
                                />
                            </View>

                            <TouchableOpacity
                                style={[
                                    globalStyles.buttonPrimary,
                                    styles.modalSaveButton,
                                    isActionLoading && { opacity: 0.6 },
                                ]}
                                disabled={isActionLoading}
                                onPress={handleSubmitForApproval}
                            >
                                {isActionLoading ? (
                                    <ActivityIndicator size="small" color={COLORS.surface} />
                                ) : (
                                    <Text style={globalStyles.buttonTextPrimary}>Submit Count</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
    );
}

type AssignProps = {
    reassignModalVisible: boolean;
    setReassignModalVisible: Dispatch<SetStateAction<boolean>>;
    hasOwner: boolean;
    employees: Employee[];
    isLoadingEmployees: boolean;
    selectedEmployeeId: number | null;
    setSelectedEmployeeId: Dispatch<SetStateAction<number | null>>;
    isTransferring: boolean;
    handleTransferOwnership: () => Promise<void>;
};

export function AssignCycleCountModal({ reassignModalVisible, setReassignModalVisible, hasOwner, employees, isLoadingEmployees, selectedEmployeeId, setSelectedEmployeeId, isTransferring, handleTransferOwnership }: AssignProps) {
    return (
            <Modal
                visible={reassignModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setReassignModalVisible(false)}
            >
                <View style={globalStyles.modalOverlay}>
                    <View style={[globalStyles.modalContentWrapper, { maxHeight: "80%" }]}>
                        <View style={globalStyles.modalCardContainer}>
                            <View style={globalStyles.modalHeader}>
                                <View>
                                    <Text style={globalStyles.modalTitle}>
                                        {hasOwner ? "Transfer Ownership" : "Assign Ownership"}
                                    </Text>
                                    <Text style={globalStyles.modalSubtitle}>
                                        Assign this cycle count to a store employee
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setReassignModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {isLoadingEmployees ? (
                                <View style={{ paddingVertical: SPACING.xxlPlus, alignItems: "center" }}>
                                    <ActivityIndicator size="small" color={COLORS.primary} />
                                </View>
                            ) : (
                                <FlatList
                                    style={{ maxHeight: 280, marginVertical: SPACING.smd }}
                                    data={employees}
                                    keyExtractor={(emp) => String(emp.employee_id)}
                                    extraData={selectedEmployeeId}
                                    renderItem={({ item: emp }) => {
                                        const isSelected = selectedEmployeeId === emp.employee_id;
                                        return (
                                            <TouchableOpacity
                                                style={[
                                                    styles.empSelectItem,
                                                    isSelected && styles.empSelectItemActive,
                                                ]}
                                                onPress={() => setSelectedEmployeeId(emp.employee_id)}
                                            >
                                                <Ionicons
                                                    name={isSelected ? "radio-button-on" : "radio-button-off"}
                                                    size={20}
                                                    color={isSelected ? COLORS.primary : COLORS.textSecondary}
                                                />
                                                <View style={{ marginLeft: SPACING.md, flex: 1 }}>
                                                    <Text
                                                        style={[
                                                            styles.empSelectName,
                                                            isSelected && styles.empSelectNameActive,
                                                        ]}
                                                    >
                                                        {emp.first_name} {emp.last_name}
                                                    </Text>
                                                    <Text style={styles.empSelectRole}>
                                                        {emp.role} • {emp.email}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    }}
                                />
                            )}

                            <TouchableOpacity
                                style={[
                                    globalStyles.buttonPrimary,
                                    styles.modalSaveButton,
                                    isTransferring && { opacity: 0.6 },
                                ]}
                                disabled={isTransferring}
                                onPress={handleTransferOwnership}
                            >
                                {isTransferring ? (
                                    <ActivityIndicator size="small" color={COLORS.surface} />
                                ) : (
                                    <Text style={globalStyles.buttonTextPrimary}>
                                        {hasOwner ? "Confirm Transfer" : "Confirm Assignment"}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
    );
}
