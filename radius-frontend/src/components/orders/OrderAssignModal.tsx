import { assignOnlineOrder } from "@/api/onlineOrders.api";
import { getAssignableEmployees } from "@/api/employees.api";
import { COLORS } from "@/constants/colors";
import { FONT_SIZE, globalStyles, RADIUS, SPACING } from "@/constants/styles";
import { Employee } from "@/types/admin.types";
import { OnlineOrder } from "@/types/order.types";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
    visible: boolean;
    order: OnlineOrder;
    role: string | undefined;
    logout: () => Promise<void>;
    onClose: () => void;
    onAssigned: (employeeId: number, name: string) => void;
};

export function OrderAssignModal({ visible, order, role, logout, onClose, onAssigned }: Props) {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);

    const loadEmployees = useCallback(async () => {
        setIsLoading(true);
        const data = await getAssignableEmployees(role, order.store_id, logout);
        if (data?.employees) {
            setEmployees(data.employees.filter((employee) => !employee.is_terminated && employee.role !== "ADMIN"));
        }
        setIsLoading(false);
    }, [role, order.store_id, logout]);

    useEffect(() => {
        if (!visible) return;
        setSelectedEmployeeId(order.assigned_to || null);
        void loadEmployees();
    }, [visible, order.assigned_to, loadEmployees]);

    const assign = async () => {
        if (!selectedEmployeeId) {
            Alert.alert("Validation", "Please select an employee to assign this order to.");
            return;
        }
        setIsAssigning(true);
        const result = await assignOnlineOrder(order.order_id, selectedEmployeeId, logout);
        if (result) {
            const selected = employees.find((employee) => employee.employee_id === selectedEmployeeId);
            const name = result.assigned_to_name || (selected ? `${selected.first_name} ${selected.last_name}` : "Associate");
            onAssigned(selectedEmployeeId, name);
            onClose();
            Alert.alert("Success", `Order #${order.order_id} assigned to ${name}.`);
        }
        setIsAssigning(false);
    };

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <View style={globalStyles.modalOverlay}>
                <View style={[globalStyles.modalContentWrapper, styles.wrapper]}>
                    <View style={globalStyles.modalCardContainer}>
                        <View style={globalStyles.modalHeader}>
                            <View style={styles.flex}>
                                <Text style={globalStyles.modalTitle}>{order.assigned_to ? "Reassign Order" : "Assign Order"}</Text>
                                <Text style={globalStyles.modalSubtitle}>Assign this order to a store associate</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close assign order">
                                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {isLoading ? (
                            <View style={styles.loading}>
                                <ActivityIndicator size="small" color={COLORS.primary} />
                            </View>
                        ) : (
                            <FlatList
                                style={styles.list}
                                data={employees}
                                keyExtractor={(employee) => String(employee.employee_id)}
                                extraData={selectedEmployeeId}
                                renderItem={({ item: employee }) => {
                                    const selected = selectedEmployeeId === employee.employee_id;
                                    return (
                                        <TouchableOpacity
                                            style={[styles.employee, selected && styles.employeeSelected]}
                                            onPress={() => setSelectedEmployeeId(employee.employee_id)}
                                        >
                                            <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={20} color={selected ? COLORS.primary : COLORS.textSecondary} />
                                            <View style={styles.employeeInfo}>
                                                <Text style={[styles.employeeName, selected && styles.employeeNameSelected]}>{employee.first_name} {employee.last_name}</Text>
                                                <Text style={styles.employeeRole}>{employee.role} • Store #{employee.store_id}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                }}
                                ListEmptyComponent={<View style={styles.empty}><Text style={globalStyles.emptyText}>No available employees in this store</Text></View>}
                            />
                        )}

                        <View style={styles.actions}>
                            <TouchableOpacity style={[globalStyles.buttonSecondary, styles.flex]} onPress={onClose}>
                                <Text style={globalStyles.buttonTextSecondary}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[globalStyles.buttonPrimary, styles.flex, (!selectedEmployeeId || isAssigning) && styles.disabled]}
                                disabled={!selectedEmployeeId || isAssigning}
                                onPress={assign}
                            >
                                {isAssigning ? <ActivityIndicator size="small" color={COLORS.surface} /> : (
                                    <Text style={globalStyles.buttonTextPrimary}>{order.assigned_to ? "Reassign" : "Assign"}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    wrapper: { maxHeight: "80%" },
    flex: { flex: 1 },
    loading: { paddingVertical: SPACING.xxlPlus, alignItems: "center" },
    list: { maxHeight: 280, marginVertical: SPACING.smd },
    employee: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: SPACING.smd,
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.md,
        marginBottom: SPACING.xsm,
        backgroundColor: COLORS.surfaceCool,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    employeeSelected: { backgroundColor: COLORS.violetBg, borderColor: COLORS.primary },
    employeeInfo: { marginLeft: SPACING.md, flex: 1 },
    employeeName: { fontSize: FONT_SIZE.md, fontWeight: "600", color: COLORS.textPrimary },
    employeeNameSelected: { color: COLORS.primary, fontWeight: "700" },
    employeeRole: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: SPACING.xxs },
    empty: { paddingVertical: SPACING.xl, alignItems: "center" },
    actions: { flexDirection: "row", gap: SPACING.md, marginTop: SPACING.lg },
    disabled: { opacity: 0.6 },
});
