// radius-frontend/app/(app)/home/actions/admin/Employees.tsx
import { apiFetch, UnauthorizedError } from "@/api/client";
import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { COLORS } from "@/constants/colors";
import { ENDPOINTS } from "@/constants/routes";
import { globalStyles } from "@/constants/styles";
import { useAuth } from "@/hooks/useAuth";
import { Employee, GetAllEmployeeResponse } from "@/types/admin.types";
import { EmployeeRole } from "@/types/auth.types";
import { capitalize, showToast } from "@/utils/helpers";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DetailRow } from "@/components/common/DetailRow";
import { ActionButtonRow } from "@/components/common/ActionButtonRow";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { TerminatedBadge } from "@/components/common/TerminatedBadge";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import CustomToast from "@/components/common/Toast";

const ROLES: EmployeeRole[] = ["SALES", "SERVICE", "MANAGER", "ADMIN"];

type FormMode = "create" | "edit";
interface PillOption<T> {
    label: string;
    value: T;
}

const ROLE_OPTIONS: PillOption<EmployeeRole>[] = ROLES.map((role) => ({
    label: capitalize(role),
    value: role,
}));

const STATUS_OPTIONS: PillOption<boolean>[] = [
    { label: "Active", value: true },
    { label: "Inactive", value: false },
];

const TERMINATED_OPTIONS: PillOption<boolean>[] = [
    { label: "No", value: false },
    { label: "Yes", value: true },
];

async function callApi<T>(endpoint: string, options: { method: string; body?: any }, logout: () => Promise<void>): Promise<T | null> {
    try {
        return await apiFetch<T>(endpoint, {
            method: options.method,
            body: options.body ? JSON.stringify(options.body) : undefined,
        });
    } catch (err) {
        showToast("error", String(err));
        if (err instanceof UnauthorizedError) {
            await logout();
        }
        return null;
    }
}

interface EmployeeFormValues {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    role: EmployeeRole;
    phone: string;
    address: string;
    city: string;
    province: string;
    postal_code: string;
    store_id: string;
    is_active: boolean;
    is_terminated: boolean;
}

const createEmptyFormValues = (): EmployeeFormValues => ({
    first_name: "", last_name: "", email: "", password: "", role: "SALES",
    phone: "", address: "", city: "", province: "", postal_code: "", store_id: "", is_active: true,
    is_terminated: false,
});

const employeeToFormValues = (employee: Employee): EmployeeFormValues => ({
    first_name: employee.first_name,
    last_name: employee.last_name,
    email: employee.email,
    password: "",
    role: employee.role,
    phone: employee.phone,
    address: employee.address,
    city: employee.city,
    province: employee.province,
    postal_code: employee.postal_code,
    store_id: String(employee.store_id),
    is_active: employee.is_active ?? true,
    is_terminated: employee.is_terminated ?? false,
});

const formValuesToEmployee = (formValues: EmployeeFormValues, base: Employee): Employee => ({
    ...base,
    first_name: formValues.first_name, last_name: formValues.last_name, email: formValues.email,
    role: formValues.role, phone: formValues.phone, address: formValues.address, city: formValues.city,
    province: formValues.province, postal_code: formValues.postal_code, store_id: parseInt(formValues.store_id, 10),
    is_active: formValues.is_active, is_terminated: formValues.is_terminated ?? false
});

function PillGroup<T,>({ options, value, onChange }: { options: PillOption<T>[]; value: T; onChange: (value: T) => void; }) {
    return (
        <View style={styles.rolesContainer}>
            {options.map((option) => {
                const isSelected = option.value === value;
                return (
                    <TouchableOpacity
                        key={String(option.value)}
                        style={[styles.rolePill, isSelected && styles.rolePillActive]}
                        onPress={() => onChange(option.value)}
                    >
                        <Text style={[styles.rolePillText, isSelected && styles.rolePillTextActive]}>{option.label}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

interface EmployeeDetailModalProps {
    employee: Employee | null;
    visible: boolean;
    onClose: () => void;
    onEdit: (employee: Employee) => void;
    onTerminated: () => void;
    onActivated: () => void;
}

const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({ employee, visible, onClose, onEdit, onTerminated, onActivated }) => {
    const { logout } = useAuth();
    const [isTerminating, setIsTerminating] = useState(false);
    const [isActivating, setIsActivating] = useState(false);

    if (!employee) {
        return null;
    }

    const confirmTerminate = async () => {
        setIsTerminating(true);
        const result = await callApi(
            ENDPOINTS.AUTHENTICATED.ADMIN.EMPLOYEES.terminate,
            { method: "POST", body: { employee_id: employee.employee_id } },
            logout
        );
        setIsTerminating(false);

        if (result !== null) {
            showToast("success", "Employee terminated");
            onTerminated();
            onClose();
        }
    };

    const confirmActivate = async () => {
        setIsActivating(true);
        const result = await callApi(
            ENDPOINTS.AUTHENTICATED.ADMIN.EMPLOYEES.activate,
            { method: "POST", body: { employee_id: employee.employee_id } },
            logout
        );
        setIsActivating(false);

        if (result !== null) {
            showToast("success", "Employee activated");
            onActivated();
            onClose();
        }
    };

    const handleTerminatePress = () => {
        Alert.alert(
            "Terminate Employee",
            `Are you sure you want to terminate ${employee.first_name} ${employee.last_name}?`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Terminate", style: "destructive", onPress: confirmTerminate },
            ]
        );
    };

    const handleActivatePress = () => {
        Alert.alert(
            "Activate Employee",
            `Are you sure you want to activate ${employee.first_name} ${employee.last_name}?`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Activate", style: "destructive", onPress: confirmActivate },
            ]
        );
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={globalStyles.modalOverlay}>
                <View style={globalStyles.modalContentWrapper}>
                    <View style={globalStyles.modalCardContainer}>
                        <View style={globalStyles.modalHeader}>
                            <View>
                                <Text style={globalStyles.modalName}>{employee.first_name} {employee.last_name}</Text>
                                <Text style={globalStyles.modalRole}>{capitalize(employee.role)}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                <TerminatedBadge isTerminated={employee.is_terminated} />
                                <StatusBadge isActive={employee.is_active} />
                            </View>
                        </View>

                        <View style={globalStyles.divider} />

                        <View style={globalStyles.section}>
                            <Text style={globalStyles.sectionTitle}>Contact Information</Text>
                            <DetailRow label="Email:" value={employee.email} />
                            <DetailRow label="Phone:" value={employee.phone} />
                        </View>

                        <View style={globalStyles.divider} />

                        <View style={globalStyles.section}>
                            <Text style={globalStyles.sectionTitle}>Address</Text>
                            <Text style={globalStyles.emptyText}>{employee.address}</Text>
                            <Text style={globalStyles.emptyText}>{employee.city}, {employee.province} {employee.postal_code}</Text>
                        </View>

                        <View style={globalStyles.divider} />

                        <View style={globalStyles.section}>
                            <Text style={globalStyles.sectionTitle}>System Details</Text>
                            <DetailRow label="Employee ID:" value={employee.employee_id} />
                            <DetailRow label="Store ID:" value={employee.store_id} />
                        </View>
                    </View>

                    <ActionButtonRow
                        buttons={[
                            { key: "close", label: "Close", kind: "neutral", onPress: onClose, disabled: isTerminating },
                            { key: "edit", label: "Edit", kind: "accent", onPress: () => onEdit(employee), disabled: isTerminating },
                            employee.is_terminated ?
                                { key: "activate", label: "Activate", kind: "primary", onPress: handleActivatePress, loading: isActivating } :
                                { key: "terminate", label: "Terminate", kind: "danger", onPress: handleTerminatePress, loading: isTerminating },
                        ]}
                    />
                </View>
            </View>
            <CustomToast />
        </Modal>
    );
};

interface EmployeeFormModalProps {
    visible: boolean;
    mode: FormMode;
    employee?: Employee | null;
    onBack: () => void;
    onSuccess: (updatedEmployee?: Employee) => void;
}

const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({ visible, mode, employee, onBack, onSuccess }) => {
    const { logout } = useAuth();
    const [formValues, setFormValues] = useState<EmployeeFormValues>(createEmptyFormValues());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditMode = mode === "edit";

    useEffect(() => {
        if (!visible) return;
        setFormValues(isEditMode && employee ? employeeToFormValues(employee) : createEmptyFormValues());
    }, [visible, isEditMode, employee]);

    const updateField = <K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) => {
        setFormValues((prev) => ({ ...prev, [key]: value }));
    };

    const isFormValid = (): boolean => {
        const { first_name, last_name, email, store_id, password, is_active, is_terminated } = formValues;
        const missingRequired = !first_name || !last_name || !email || !store_id || (!isEditMode && !password);

        if (missingRequired) {
            showToast("error", "Please fill in all required fields");
            return false;
        }

        if (is_terminated && is_active) {
            showToast("error", "An employee cannot be active while being terminated.");
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!isFormValid()) return;

        const payload: Record<string, any> = {
            ...formValues,
            store_id: parseInt(formValues.store_id, 10),
        };

        if (isEditMode && employee) {
            payload.employee_id = employee.employee_id;
            delete payload.password;
        }

        setIsSubmitting(true);
        const endpoint = isEditMode ? ENDPOINTS.AUTHENTICATED.ADMIN.EMPLOYEES.update : ENDPOINTS.AUTHENTICATED.ADMIN.EMPLOYEES.create;
        const result = await callApi(endpoint, { method: isEditMode ? "PUT" : "POST", body: payload }, logout);
        setIsSubmitting(false);

        if (result !== null) {
            showToast("success", isEditMode ? "Employee updated successfully!" : "Employee created successfully!");
            onSuccess((isEditMode && employee) ? formValuesToEmployee(formValues, employee) : undefined);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onBack}>
            <KeyboardAvoidingView style={globalStyles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <View style={[globalStyles.modalContentWrapper, { maxHeight: "85%" }]}>
                    <View style={[styles.formHeader, isEditMode && styles.formHeaderEdit]}>
                        <Text style={globalStyles.modalName}>{isEditMode ? "Edit Employee" : "Create Employee"}</Text>
                    </View>

                    <ScrollView style={[styles.formContainer, { backgroundColor: COLORS.background }]} showsVerticalScrollIndicator>
                        <Text style={styles.inputLabel}>Name *</Text>
                        <View style={styles.inputRow}>
                            <TextInput
                                style={[styles.input, styles.inputHalf]}
                                placeholder="First Name"
                                value={formValues.first_name}
                                onChangeText={(text) => updateField("first_name", text)}
                            />
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Last Name"
                                value={formValues.last_name}
                                onChangeText={(text) => updateField("last_name", text)}
                            />
                        </View>

                        <Text style={styles.inputLabel}>Account Details *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={formValues.email}
                            onChangeText={(text) => updateField("email", text)}
                        />
                        {!isEditMode && (
                            <TextInput
                                style={styles.input}
                                placeholder="Temporary Password"
                                secureTextEntry
                                value={formValues.password}
                                onChangeText={(text) => updateField("password", text)}
                            />
                        )}
                        <TextInput
                            style={styles.input}
                            placeholder="Store ID"
                            keyboardType="numeric"
                            value={formValues.store_id}
                            onChangeText={(text) => updateField("store_id", text)}
                        />

                        <Text style={styles.inputLabel}>Role *</Text>
                        <PillGroup options={ROLE_OPTIONS} value={formValues.role} onChange={(v) => updateField("role", v)} />

                        <Text style={styles.inputLabel}>Status *</Text>
                        <PillGroup options={STATUS_OPTIONS} value={formValues.is_active} onChange={(v) => updateField("is_active", v)} />

                        <Text style={styles.inputLabel}>Terminated *</Text>
                        <PillGroup options={TERMINATED_OPTIONS} value={formValues.is_terminated} onChange={(v) => updateField("is_terminated", v)} />

                        <Text style={styles.inputLabel}>Contact & Location</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Phone"
                            keyboardType="phone-pad"
                            value={formValues.phone}
                            onChangeText={(text) => updateField("phone", text)}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Street Address"
                            value={formValues.address}
                            onChangeText={(text) => updateField("address", text)}
                        />
                        <View style={styles.inputRow}>
                            <TextInput
                                style={[styles.input, { flex: 2, marginRight: 8 }]}
                                placeholder="City"
                                value={formValues.city}
                                onChangeText={(text) => updateField("city", text)}
                            />
                            <TextInput
                                style={[styles.input, { flex: 1, marginRight: 8 }]}
                                placeholder="Prov"
                                value={formValues.province}
                                onChangeText={(text) => updateField("province", text)}
                            />
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Postal"
                                autoCapitalize="characters"
                                value={formValues.postal_code}
                                onChangeText={(text) => updateField("postal_code", text)}
                            />
                        </View>
                        <View style={{ height: 20 }} />
                    </ScrollView>

                    <ActionButtonRow
                        buttons={[{
                            key: "back",
                            label: isEditMode ? "Back" : "Cancel",
                            kind: "neutral",
                            onPress: onBack,
                            disabled: isSubmitting,
                        }, {
                            key: "submit",
                            label: isEditMode ? "Save" : "Create",
                            kind: isEditMode ? "accent" : "primary",
                            onPress: handleSubmit,
                            loading: isSubmitting,
                        }]}
                    />
                </View>
            </KeyboardAvoidingView>
            <CustomToast />
        </Modal>
    );
};

export default function Employees() {
    const { logout } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [detailModalVisible, setDetailModalVisible] = useState(false);

    const [formModalVisible, setFormModalVisible] = useState(false);
    const [formMode, setFormMode] = useState<FormMode>("create");

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        setIsLoading(true);
        setError(null);

        const data = await callApi<GetAllEmployeeResponse>(ENDPOINTS.AUTHENTICATED.ADMIN.EMPLOYEES.getAll, { method: "GET" }, logout);

        if (data) {
            showToast("success", data.message);
            setEmployees(data.employees || []);
        } else {
            setError("Could not load employees. Please try again.");
        }
        setIsLoading(false);
    };

    const handleViewEmployee = (employee: Employee) => {
        setSelectedEmployee(employee);
        setDetailModalVisible(true);
    };

    const handleCloseDetailModal = () => {
        setDetailModalVisible(false);
        setSelectedEmployee(null);
    };

    const handleOpenCreateForm = () => {
        setFormMode("create");
        setFormModalVisible(true);
    };

    const handleOpenEditForm = (employee: Employee) => {
        setSelectedEmployee(employee);
        setFormMode("edit");
        setDetailModalVisible(false);
        setFormModalVisible(true);
    };

    const handleFormBack = () => {
        setFormModalVisible(false);
        if (formMode === "edit") {
            setDetailModalVisible(true);
        }
    };

    const handleFormSuccess = (updatedEmployee?: Employee) => {
        fetchEmployees();
        setFormModalVisible(false);
        if (formMode === "edit") {
            if (updatedEmployee) setSelectedEmployee(updatedEmployee);
            setDetailModalVisible(true);
        }
    };

    const renderEmployeeCard = ({ item }: { item: Employee }) => (
        <TouchableOpacity style={globalStyles.card} activeOpacity={0.7} onPress={() => handleViewEmployee(item)}>
            <View style={globalStyles.cardHeader}>
                <Text style={styles.name}>
                    {item.first_name} {item.last_name}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TerminatedBadge isTerminated={item.is_terminated} />
                    <StatusBadge isActive={item.is_active} />
                </View>
            </View>

            <View style={styles.detailsContainer}>
                <DetailRow layout="inline" label="Role: " value={capitalize(item.role)} />
                <DetailRow layout="inline" label="Email: " value={item.email} />
                <DetailRow layout="inline" label="Store ID: " value={item.store_id} />
            </View>
        </TouchableOpacity>
    );

    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={<Text style={globalStyles.headerTitle}>Employees</Text>}
                headerRight={
                    <TouchableOpacity onPress={handleOpenCreateForm}>
                        <Image source={require("@/assets/images/plus.png")} style={globalStyles.headerImageSize} />
                    </TouchableOpacity>
                }
            />

            <View style={globalStyles.container}>
                {isLoading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={globalStyles.centerElement} />
                ) : error ? (
                    <Text style={globalStyles.errorText}>{error}</Text>
                ) : employees.length === 0 ? (
                    <Text style={globalStyles.emptyText}>No employees found.</Text>
                ) : (
                    <FlatList
                        data={employees}
                        keyExtractor={(item) => item.employee_id.toString()}
                        style={{ backgroundColor: COLORS.background }}
                        renderItem={renderEmployeeCard}
                        contentContainerStyle={globalStyles.listContainer}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

            <EmployeeDetailModal
                employee={selectedEmployee}
                visible={detailModalVisible}
                onClose={handleCloseDetailModal}
                onEdit={handleOpenEditForm}
                onTerminated={fetchEmployees}
                onActivated={fetchEmployees}
            />

            <EmployeeFormModal
                visible={formModalVisible}
                mode={formMode}
                employee={formMode === "edit" ? selectedEmployee : null}
                onBack={handleFormBack}
                onSuccess={handleFormSuccess}
            />
        </TopSafeAreaView>
    );
}

const styles = StyleSheet.create({
    addIcon: {
        width: 25,
        height: 25
    },
    name: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.textPrimary
    },
    detailsContainer: {
        gap: 6
    },
    formHeader: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: "#FAFAFA"
    },
    formHeaderEdit: {
        borderBottomColor: COLORS.accent,
        backgroundColor: "#EEF3F8"
    },
    formContainer: {
        padding: 20
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textSecondary,
        marginBottom: 8,
        marginTop: 12
    },
    input: {
        backgroundColor: COLORS.inputBg,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        marginBottom: 12,
        color: COLORS.textPrimary,
    },
    inputRow: {
        flexDirection: "row",
        justifyContent: "space-between"
    },
    inputHalf: {
        flex: 1,
        marginRight: 8
    },
    rolesContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 12
    },
    rolePill: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
    },
    rolePillActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary
    },
    rolePillText: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textSecondary
    },
    rolePillTextActive: {
        color: "#FFFFFF"
    },
});
