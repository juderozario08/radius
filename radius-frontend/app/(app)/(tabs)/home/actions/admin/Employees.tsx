import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";
import { EmployeeDetailModal, EmployeeFormModal, FormMode } from "@/components/employees/EmployeeModals";
import { EmployeeCard } from "@/components/employees/EmployeeCard";
import { employeeScreenStyles as styles } from "@/components/employees/employeeScreenStyles";
import { getEmployees } from "@/api/employees.api";
import { useAuth } from "@/hooks/useAuth";
import { Employee } from "@/types/admin.types";
import { showToast } from "@/utils/helpers";
import React, { useEffect, useState, useCallback } from "react";
import { FlatList, Image, Text, TouchableOpacity, View } from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import Pagination from "@/components/common/Pagination";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useLocalSearchParams } from "expo-router";

export default function Employees() {
    const { store_id } = useLocalSearchParams<{ store_id: string }>();
    const { logout } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [detailModalVisible, setDetailModalVisible] = useState(false);

    const [formModalVisible, setFormModalVisible] = useState(false);
    const [formMode, setFormMode] = useState<FormMode>("create");

    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalLength, setTotalLength] = useState(0);

    const fetchEmployees = useCallback(async (page: number, limit: number) => {
        setIsLoading(true);
        setError(null);

        const data = await getEmployees(page, limit, store_id, logout);

        if (data) {
            showToast("success", data.message);
            setEmployees(data.employees || []);
            setTotalLength(data.total_length || 0);
        } else {
            setError("Could not load employees. Please try again.");
        }
        setIsLoading(false);
    }, [logout, store_id]);

    useEffect(() => {
        void fetchEmployees(pageNumber, pageSize);
    }, [fetchEmployees, pageNumber, pageSize]);

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
        fetchEmployees(pageNumber, pageSize);
        setFormModalVisible(false);
        if (formMode === "edit") {
            if (updatedEmployee) setSelectedEmployee(updatedEmployee);
            setDetailModalVisible(true);
        }
    };

    const renderEmployeeCard = useCallback(({ item }: { item: Employee }) => (
        <EmployeeCard employee={item} onPress={handleViewEmployee} />
    ), []);

    const totalPages = Math.max(1, Math.ceil(totalLength / pageSize));

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

            <View style={[globalStyles.container, styles.listWrapper]}>
                {isLoading && employees.length === 0 ? (
                    <LoadingSpinner style={globalStyles.centerElement} />
                ) : error ? (
                    <Text style={globalStyles.errorText}>{error}</Text>
                ) : (
                    <>
                        {employees.length === 0 ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={globalStyles.emptyText}>No employees found.</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={employees}
                                keyExtractor={(item) => item.employee_id.toString()}
                                style={{ backgroundColor: COLORS.background }}
                                renderItem={renderEmployeeCard}
                                contentContainerStyle={globalStyles.listContainer}
                                showsVerticalScrollIndicator={false}
                                initialNumToRender={10}
                                windowSize={5}
                                maxToRenderPerBatch={10}
                            />
                        )}
                        <Pagination
                            currentPage={pageNumber}
                            totalPages={totalPages}
                            onPageChange={setPageNumber}
                            isLoading={isLoading}
                            pageSize={pageSize}
                            pageSizeOptions={[10, 20, 50]}
                            onPageSizeChange={handlePageSizeChange}
                        />
                    </>
                )}
            </View>

            <EmployeeDetailModal
                employee={selectedEmployee}
                visible={detailModalVisible}
                onClose={handleCloseDetailModal}
                onEdit={handleOpenEditForm}
                onTerminated={() => fetchEmployees(pageNumber, pageSize)}
                onActivated={() => fetchEmployees(pageNumber, pageSize)}
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
