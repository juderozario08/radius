// radius-frontend/app/(app)/home/actions/admin/Employees.tsx
import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    Image,
    Modal,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { apiFetch } from "@/api/client";
import Toast from "react-native-toast-message";
import { Employee, GetAllEmployeeResponse } from "@/types/admin.types";

interface EmployeeCardModalType {
    item: Employee;
}
const EmployeeCardModal: React.FC<EmployeeCardModalType> = ({ item }) => (
    <View style={styles.modalCardContainer}>
        {/* Header Section: Identity & Status */}
        <View style={styles.modalHeader}>
            <View>
                <Text style={styles.modalName}>{item.first_name} {item.last_name}</Text>
                <Text style={styles.modalRole}>{item.role}</Text>
            </View>
            <View style={[
                styles.statusBadge,
                { backgroundColor: item.is_active ? '#E8F5E9' : '#FFEBEE' }
            ]}>
                <Text style={[
                    styles.statusText,
                    { color: item.is_active ? '#2E7D32' : '#C70202' }
                ]}>
                    {item.is_active ? 'Active' : 'Inactive'}
                </Text>
            </View>
        </View>

        <View style={styles.divider} />

        {/* Contact Information */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.row}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{item.email}</Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>Phone:</Text>
                <Text style={styles.value}>{item.phone}</Text>
            </View>
        </View>

        <View style={styles.divider} />

        {/* Location Information */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address</Text>
            <Text style={styles.value}>{item.address}</Text>
            <Text style={styles.value}>{item.city}, {item.province} {item.postal_code}</Text>
        </View>

        <View style={styles.divider} />

        {/* System Information */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>System Details</Text>
            <View style={styles.row}>
                <Text style={styles.label}>Employee ID:</Text>
                <Text style={styles.value}>{item.employee_id}</Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>Store ID:</Text>
                <Text style={styles.value}>{item.store_id}</Text>
            </View>
        </View>
    </View>
);

const ROLES = ["SALES", "SERVICE", "MANAGER", "ADMIN"];
const IS_ACTIVE = ["TRUE", "FALSE"];

interface CreateEmployeeModalType {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CreateEmployeeModal: React.FC<CreateEmployeeModalType> = ({ visible, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        first_name: '', last_name: '', email: '', password: '', role: 'SALES',
        phone: '', address: '', city: '', province: '', postal_code: '', store_id: '', is_active: true,
    });
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (visible) {
            setFormData({
                first_name: '', last_name: '', email: '', password: '', role: 'SALES',
                phone: '', address: '', city: '', province: '', postal_code: '', store_id: '', is_active: true
            });
        }
    }, [visible]);

    const updateForm = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleCreateEmployee = async () => {
        if (!formData.first_name || !formData.last_name || !formData.email || !formData.store_id) {
            Toast.show({ type: "error", text1: "Please fill in all required fields", position: "bottom" });
            return;
        }

        try {
            setIsCreating(true);
            const payload = { ...formData, store_id: parseInt(formData.store_id, 10) };

            await apiFetch<any>("/api/admin/create_employee", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            Toast.show({ type: 'success', text1: 'Employee created successfully!', position: "bottom" });
            onSuccess();
            onClose();
        } catch (err) {
            Toast.show({ type: "error", text1: String(err), position: "bottom" });
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={styles.modalOverlay}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <View style={[styles.modalContentWrapper, { maxHeight: '85%' }]}>
                    <View style={styles.createHeader}>
                        <Text style={styles.modalName}>Create Employee</Text>
                    </View>

                    <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={true}>
                        <Text style={styles.inputLabel}>Name *</Text>
                        <View style={styles.inputRow}>
                            <TextInput
                                style={[styles.input, { flex: 1, marginRight: 8 }]}
                                placeholder="First Name"
                                value={formData.first_name}
                                onChangeText={(text) => updateForm('first_name', text)}
                            />
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Last Name"
                                value={formData.last_name}
                                onChangeText={(text) => updateForm('last_name', text)}
                            />
                        </View>

                        <Text style={styles.inputLabel}>Account Details *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={formData.email}
                            onChangeText={(text) => updateForm('email', text)}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Temporary Password"
                            secureTextEntry
                            value={formData.password}
                            onChangeText={(text) => updateForm('password', text)}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Store ID"
                            keyboardType="numeric"
                            value={formData.store_id}
                            onChangeText={(text) => updateForm('store_id', text)}
                        />

                        <Text style={styles.inputLabel}>Role *</Text>
                        <View style={styles.rolesContainer}>
                            {ROLES.map((role) => (
                                <TouchableOpacity
                                    key={role}
                                    style={[styles.rolePill, formData.role === role && styles.rolePillActive]}
                                    onPress={() => updateForm('role', role)}
                                >
                                    <Text style={[styles.rolePillText, formData.role === role && styles.rolePillTextActive]}>{role}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.inputLabel}>Status *</Text>
                        <View style={styles.rolesContainer}>
                            {IS_ACTIVE.map((active) => {
                                const isActiveBool = active === "TRUE";
                                return (
                                    <TouchableOpacity
                                        key={active}
                                        style={[styles.rolePill, formData.is_active === isActiveBool && styles.rolePillActive]}
                                        onPress={() => updateForm('is_active', isActiveBool)}
                                    >
                                        <Text style={[styles.rolePillText, formData.is_active === isActiveBool && styles.rolePillTextActive]}>{active}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Text style={styles.inputLabel}>Contact & Location</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Phone"
                            keyboardType="phone-pad"
                            value={formData.phone}
                            onChangeText={(text) => updateForm('phone', text)}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Street Address"
                            value={formData.address}
                            onChangeText={(text) => updateForm('address', text)}
                        />
                        <View style={styles.inputRow}>
                            <TextInput
                                style={[styles.input, { flex: 2, marginRight: 8 }]}
                                placeholder="City"
                                value={formData.city}
                                onChangeText={(text) => updateForm('city', text)}
                            />
                            <TextInput
                                style={[styles.input, { flex: 1, marginRight: 8 }]}
                                placeholder="Prov"
                                value={formData.province}
                                onChangeText={(text) => updateForm('province', text)}
                            />
                            <TextInput
                                style={[styles.input, { flex: 1.5 }]}
                                placeholder="Postal"
                                autoCapitalize="characters"
                                value={formData.postal_code}
                                onChangeText={(text) => updateForm('postal_code', text)}
                            />
                        </View>
                        <View style={{ height: 20 }} />
                    </ScrollView>

                    <View style={styles.createActions}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.cancelButton]}
                            onPress={onClose}
                            disabled={isCreating}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.submitButton]}
                            onPress={handleCreateEmployee}
                            disabled={isCreating}
                        >
                            {isCreating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Create</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

export default function Employees() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const [createModalVisible, setCreateModalVisible] = useState(false);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const data = await apiFetch<GetAllEmployeeResponse>("/api/admin/get_all_employees")
            Toast.show({
                type: 'success',
                text1: data.message,
                visibilityTime: 1000,
                autoHide: true,
                position: "bottom",
            })
            setEmployees(data.employees || []);
        } catch (err) {
            setError("Could not load employees. Please try again.");
            Toast.show({
                type: "error",
                text1: String(err),
                visibilityTime: 1000,
                autoHide: true,
                position: "bottom",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (employee: Employee) => {
        setSelectedEmployee(employee);
        setModalVisible(true);
    };

    const handleCloseModal = () => {
        setModalVisible(false);
        setSelectedEmployee(null);
    };

    const renderEmployeeCard = ({ item }: { item: Employee }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => handleOpenModal(item)}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.name}>{item.first_name} {item.last_name}</Text>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: item.is_active ? '#E8F5E9' : '#FFEBEE' }
                ]}>
                    <Text style={[
                        styles.statusText,
                        { color: item.is_active ? '#2E7D32' : '#C70202' }
                    ]}>
                        {item.is_active ? 'Active' : 'Inactive'}
                    </Text>
                </View>
            </View>

            <View style={styles.detailsContainer}>
                <Text style={styles.detailRow}>
                    <Text style={styles.label}>Role: </Text>
                    <Text style={styles.value}>{item.role[0] + item.role.substring(1).toLowerCase()}</Text>
                </Text>
                <Text style={styles.detailRow}>
                    <Text style={styles.label}>Email: </Text>
                    <Text style={styles.value}>{item.email}</Text>
                </Text>
                <Text style={styles.detailRow}>
                    <Text style={styles.label}>Store ID: </Text>
                    <Text style={styles.value}>{item.store_id}</Text>
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={
                    <View style={{ flexDirection: 'row' }}>
                        <Text style={styles.headerTitle}>Employees</Text>
                    </View>
                }
                headerRight={(
                    <View style={{ flexDirection: 'row' }}>
                        <TouchableOpacity onPress={() => setCreateModalVisible(true)}>
                            <Image
                                source={require("@/assets/images/plus.png")}
                                style={{ width: 30, height: 30 }}
                            />
                        </TouchableOpacity>
                    </View>
                )}
            />

            <View style={styles.content}>
                {isLoading ? (
                    <ActivityIndicator size="large" color="#C70202" style={styles.centerElement} />
                ) : error ? (
                    <Text style={styles.errorText}>{error}</Text>
                ) : employees.length === 0 ? (
                    <Text style={styles.emptyText}>No employees found.</Text>
                ) : (
                    <FlatList
                        data={employees}
                        keyExtractor={(item) => item.employee_id.toString()}
                        renderItem={renderEmployeeCard}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

            {/* View Employee Details Modal */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={handleCloseModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContentWrapper}>
                        {selectedEmployee && <EmployeeCardModal item={selectedEmployee} />}

                        <TouchableOpacity style={styles.closeButton} onPress={handleCloseModal}>
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Create New Employee Modal */}
            <CreateEmployeeModal
                visible={createModalVisible}
                onClose={() => setCreateModalVisible(false)}
                onSuccess={fetchEmployees}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    headerTitle: {
        fontWeight: 'bold',
        fontSize: 20,
    },
    content: {
        flex: 1,
    },
    centerElement: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        padding: 16,
        gap: 12,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },
    name: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333333',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    detailsContainer: {
        gap: 6,
    },
    detailRow: {
        fontSize: 14,
    },
    label: {
        color: '#757575',
        fontWeight: '500',
    },
    value: {
        color: '#333333',
        fontWeight: '400',
    },
    errorText: {
        color: '#C70202',
        textAlign: 'center',
        marginTop: 40,
        fontSize: 16,
    },
    emptyText: {
        color: '#757575',
        textAlign: 'center',
        marginTop: 40,
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContentWrapper: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        overflow: 'hidden',
    },
    modalCardContainer: {
        padding: 20,
        width: '100%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    modalName: {
        fontSize: 22,
        fontWeight: '700',
        color: '#333333',
        marginBottom: 4,
    },
    modalRole: {
        fontSize: 16,
        fontWeight: '500',
        color: '#757575',
        textTransform: 'capitalize',
    },
    divider: {
        height: 1,
        backgroundColor: '#EEEEEE',
        marginVertical: 12,
    },
    section: {
        gap: 8,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#9E9E9E',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    closeButton: {
        backgroundColor: '#F5F5F5',
        paddingVertical: 14,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
    },
    closeButtonText: {
        color: '#C70202',
        fontWeight: '600',
        fontSize: 16,
    },
    createHeader: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
        backgroundColor: '#FAFAFA',
    },
    formContainer: {
        padding: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#757575',
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        backgroundColor: '#F9F9F9',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        marginBottom: 12,
        color: '#333333',
    },
    inputRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    rolesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    rolePill: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    rolePillActive: {
        backgroundColor: '#C70202',
        borderColor: '#C70202',
    },
    rolePillText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#757575',
    },
    rolePillTextActive: {
        color: '#FFFFFF',
    },
    createActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
    },
    actionButton: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#F5F5F5',
    },
    submitButton: {
        backgroundColor: '#C70202',
    },
    cancelButtonText: {
        color: '#333333',
        fontWeight: '600',
        fontSize: 16,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 16,
    },
});
