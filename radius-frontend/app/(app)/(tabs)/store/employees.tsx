// radius-frontend/app/(app)/(tabs)/store/employees.tsx
import { apiFetch, UnauthorizedError } from "@/api/client";
import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { COLORS } from "@/constants/colors";
import { ENDPOINTS } from "@/constants/routes";
import { globalStyles } from "@/constants/styles";
import { useAuth } from "@/hooks/useAuth";
import { Employee, GetAllEmployeeResponse } from "@/types/admin.types";
import { callApi, capitalize, showToast } from "@/utils/helpers";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TerminatedBadge } from "@/components/common/TerminatedBadge";
import { RoleBadge } from "@/components/common/RoleBadge";
import { DetailRow } from "@/components/common/DetailRow";
import { ActionButtonRow } from "@/components/common/ActionButtonRow";
import React, { useEffect, useState, useCallback } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import Pagination from "@/components/common/Pagination";

interface EmployeeDetailModalProps {
    employee: Employee | null;
    visible: boolean;
    onClose: () => void;
}

const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({ employee, visible, onClose }) => {
    if (!employee) {
        return null;
    }

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
                            { key: "close", label: "Close", kind: "neutral", onPress: onClose },
                        ]}
                    />
                </View>
            </View>
        </Modal>
    );
};

export default function StoreEmployees() {
    const { logout } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [detailModalVisible, setDetailModalVisible] = useState(false);

    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalLength, setTotalLength] = useState(0);

    useEffect(() => {
        fetchEmployees(pageNumber, pageSize);
    }, [pageNumber, pageSize]);

    const fetchEmployees = async (page: number, limit: number) => {
        setIsLoading(true);
        setError(null);

        const data = await callApi<GetAllEmployeeResponse>(`${ENDPOINTS.AUTHENTICATED.MANAGER.EMPLOYEES.getAll}?page_number=${page}&page_size=${limit}`, { method: "GET" }, logout);

        if (data) {
            setEmployees(data.employees || []);
            setTotalLength(data.total_length || 0);
        } else {
            setError("Could not load employees. Please try again.");
        }
        setIsLoading(false);
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setPageNumber(1);
    };

    const handleViewEmployee = (employee: Employee) => {
        setSelectedEmployee(employee);
        setDetailModalVisible(true);
    };

    const handleCloseDetailModal = () => {
        setDetailModalVisible(false);
        setSelectedEmployee(null);
    };

    const renderEmployeeCard = useCallback(({ item }: { item: Employee }) => (
        <TouchableOpacity style={globalStyles.card} activeOpacity={0.7} onPress={() => handleViewEmployee(item)}>
            <View style={globalStyles.cardHeader}>
                <Text style={styles.name}>
                    {item.first_name} {item.last_name}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <RoleBadge role={item.role} />
                </View>
            </View>

            <View style={styles.detailsContainer}>
                <DetailRow layout="inline" label="Employee ID: " value={item.employee_id} />
                <DetailRow layout="inline" label="Role: " value={capitalize(item.role)} />
                <DetailRow layout="inline" label="Email: " value={item.email} />
            </View>
        </TouchableOpacity>
    ), []);

    const totalPages = Math.max(1, Math.ceil(totalLength / pageSize));

    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={<Text style={globalStyles.headerTitle}>Store Employees</Text>}
            />

            <View style={[globalStyles.container, styles.listWrapper]}>
                {isLoading && employees.length === 0 ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={globalStyles.centerElement} />
                ) : error ? (
                    <Text style={globalStyles.errorText}>{error}</Text>
                ) : (
                    <>
                        {employees.length === 0 ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={globalStyles.emptyText}>No employees found for this store.</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={employees}
                                keyExtractor={(item) => item.employee_id.toString()}
                                renderItem={renderEmployeeCard}
                                contentContainerStyle={globalStyles.listContainer}
                                showsVerticalScrollIndicator={false}
                            />
                        )}

                        <Pagination
                            currentPage={pageNumber}
                            totalPages={totalPages}
                            onPageChange={setPageNumber}
                            isLoading={isLoading}
                            pageSize={pageSize}
                            pageSizeOptions={[5, 10, 20, 50]}
                            onPageSizeChange={handlePageSizeChange}
                        />
                    </>
                )}
            </View>

            <EmployeeDetailModal
                employee={selectedEmployee}
                visible={detailModalVisible}
                onClose={handleCloseDetailModal}
            />

        </TopSafeAreaView>
    );
}

const styles = StyleSheet.create({
    listWrapper: {
        flex: 1,
        paddingBottom: 0,
    },
    name: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.textPrimary,
        flex: 1,
        marginRight: 8
    },
    detailsContainer: {
        gap: 6
    },
});
