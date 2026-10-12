import React, { useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { ActionButtonRow } from "@/components/common/ActionButtonRow";
import { DetailRow } from "@/components/common/DetailRow";
import PillGroup, { PillOption } from "@/components/common/PillGroup";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TerminatedBadge } from "@/components/common/TerminatedBadge";
import { employeeScreenStyles as styles } from "@/components/employees/employeeScreenStyles";
import { CANADIAN_PROVINCES, isCanadianProvince, normalizeCanadianPostalCode } from "@/constants/canada";
import { COLORS } from "@/constants/colors";
import { globalStyles, SPACING } from "@/constants/styles";
import { useAuth } from "@/hooks/useAuth";
import { Employee } from "@/types/admin.types";
import { EmployeeRole } from "@/types/auth.types";
import { capitalize, showToast } from "@/utils/helpers";
import { activateEmployee, EmployeeFormPayload, saveEmployee, terminateEmployee } from "@/api/employees.api";

const ROLES: EmployeeRole[] = ["SALES", "SERVICE", "MANAGER", "ADMIN"];

export type FormMode = "create" | "edit";
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

interface EmployeeDetailModalProps {
    employee: Employee | null;
    visible: boolean;
    onClose: () => void;
    onEdit: (employee: Employee) => void;
    onTerminated: () => void;
    onActivated: () => void;
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({ employee, visible, onClose, onEdit, onTerminated, onActivated }) => {
    const { logout } = useAuth();
    const [isTerminating, setIsTerminating] = useState(false);
    const [isActivating, setIsActivating] = useState(false);

    if (!employee) {
        return null;
    }

    const confirmTerminate = async () => {
        setIsTerminating(true);
        const result = await terminateEmployee(employee.employee_id, logout);
        setIsTerminating(false);

        if (result !== null) {
            showToast("success", "Employee terminated");
            onTerminated();
            onClose();
        }
    };

    const confirmActivate = async () => {
        setIsActivating(true);
        const result = await activateEmployee(employee.employee_id, logout);
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
                            <View style={{ flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' }}>
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

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({ visible, mode, employee, onBack, onSuccess }) => {
    const { logout } = useAuth();
    const [formValues, setFormValues] = useState<EmployeeFormValues>(createEmptyFormValues());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditMode = mode === "edit";

    const lastNameRef = useRef<TextInput>(null);
    const emailRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);
    const storeIdRef = useRef<TextInput>(null);
    const phoneRef = useRef<TextInput>(null);
    const addressRef = useRef<TextInput>(null);
    const cityRef = useRef<TextInput>(null);
    const postalCodeRef = useRef<TextInput>(null);

    useEffect(() => {
        if (!visible) return;
        setFormValues(isEditMode && employee ? employeeToFormValues(employee) : createEmptyFormValues());
    }, [visible, isEditMode, employee]);

    const updateField = <K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) => {
        setFormValues((prev) => ({ ...prev, [key]: value }));
    };

    const isFormValid = (): boolean => {
        const {
            first_name, last_name, email, store_id, password, is_active, is_terminated,
            phone, address, city, province, postal_code,
        } = formValues;
        const missingRequired = !first_name || !last_name || !email || !store_id
            || !phone || !address || !city || !province || !postal_code
            || (!isEditMode && !password);

        if (missingRequired) {
            showToast("error", "Please fill in all required fields");
            return false;
        }

        if (!isEditMode && password.length < 8) {
            showToast("error", "Password must be at least 8 characters");
            return false;
        }

        if (!isCanadianProvince(province)) {
            showToast("error", "Please select a valid Canadian province");
            return false;
        }

        if (!normalizeCanadianPostalCode(postal_code)) {
            showToast("error", "Postal code must be in A1A 1A1 format");
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

        const { password, ...fields } = formValues;
        const payload: EmployeeFormPayload = {
            ...fields,
            ...(isEditMode ? {} : { password }),
            store_id: parseInt(formValues.store_id, 10),
            postal_code: normalizeCanadianPostalCode(formValues.postal_code) || formValues.postal_code,
        };

        setIsSubmitting(true);
        const result = await saveEmployee(isEditMode && employee ? employee.employee_id : null, payload, logout);
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
                                returnKeyType="next"
                                submitBehavior="submit"
                                onSubmitEditing={() => lastNameRef.current?.focus()}
                            />
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Last Name"
                                value={formValues.last_name}
                                onChangeText={(text) => updateField("last_name", text)}
                                ref={lastNameRef}
                                returnKeyType="next"
                                submitBehavior="submit"
                                onSubmitEditing={() => emailRef.current?.focus()}
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
                            ref={emailRef}
                            returnKeyType="next"
                            submitBehavior="submit"
                            onSubmitEditing={() => {
                                if (!isEditMode) {
                                    passwordRef.current?.focus();
                                } else {
                                    storeIdRef.current?.focus();
                                }
                            }}
                        />
                        {!isEditMode && (
                            <TextInput
                                style={styles.input}
                                placeholder="Temporary Password"
                                secureTextEntry
                                value={formValues.password}
                                onChangeText={(text) => updateField("password", text)}
                                ref={passwordRef}
                                returnKeyType="next"
                                submitBehavior="submit"
                                onSubmitEditing={() => storeIdRef.current?.focus()}
                            />
                        )}
                        <TextInput
                            style={styles.input}
                            placeholder="Store ID"
                            keyboardType="numeric"
                            value={formValues.store_id}
                            onChangeText={(text) => updateField("store_id", text)}
                            ref={storeIdRef}
                            returnKeyType="next"
                            submitBehavior="submit"
                            onSubmitEditing={() => phoneRef.current?.focus()}
                        />

                        <Text style={styles.inputLabel}>Role *</Text>
                        <PillGroup options={ROLE_OPTIONS} value={formValues.role} onChange={(v) => updateField("role", v)} />

                        <Text style={styles.inputLabel}>Status *</Text>
                        <PillGroup options={STATUS_OPTIONS} value={formValues.is_active} onChange={(v) => updateField("is_active", v)} />

                        <Text style={styles.inputLabel}>Terminated *</Text>
                        <PillGroup options={TERMINATED_OPTIONS} value={formValues.is_terminated} onChange={(v) => updateField("is_terminated", v)} />

                        <Text style={styles.inputLabel}>Contact & Location *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Phone"
                            keyboardType="phone-pad"
                            value={formValues.phone}
                            onChangeText={(text) => updateField("phone", text)}
                            ref={phoneRef}
                            returnKeyType="next"
                            submitBehavior="submit"
                            onSubmitEditing={() => addressRef.current?.focus()}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Street Address"
                            value={formValues.address}
                            onChangeText={(text) => updateField("address", text)}
                            ref={addressRef}
                            returnKeyType="next"
                            submitBehavior="submit"
                            onSubmitEditing={() => cityRef.current?.focus()}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="City"
                            value={formValues.city}
                            onChangeText={(text) => updateField("city", text)}
                            ref={cityRef}
                            returnKeyType="next"
                            submitBehavior="submit"
                            onSubmitEditing={() => postalCodeRef.current?.focus()}
                        />
                        <Text style={styles.inputLabel}>Province *</Text>
                        <PillGroup
                            options={CANADIAN_PROVINCES.map((province) => ({ label: province, value: province }))}
                            value={formValues.province}
                            onChange={(v) => updateField("province", v)}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Postal (A1A 1A1)"
                            autoCapitalize="characters"
                            value={formValues.postal_code}
                            onChangeText={(text) => updateField("postal_code", text)}
                            ref={postalCodeRef}
                            returnKeyType="done"
                            onSubmitEditing={handleSubmit}
                        />
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
        </Modal>
    );
};
