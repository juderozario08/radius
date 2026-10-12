import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { DetailRow } from "@/components/common/DetailRow";
import { RoleBadge } from "@/components/common/RoleBadge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TerminatedBadge } from "@/components/common/TerminatedBadge";
import { employeeScreenStyles as styles } from "@/components/employees/employeeScreenStyles";
import { globalStyles, SPACING } from "@/constants/styles";
import { Employee } from "@/types/admin.types";
import { capitalize } from "@/utils/helpers";

interface EmployeeCardProps {
    employee: Employee;
    onPress: (employee: Employee) => void;
}

export function EmployeeCard({ employee, onPress }: EmployeeCardProps) {
    return (
        <TouchableOpacity style={globalStyles.card} activeOpacity={0.7} onPress={() => onPress(employee)}>
            <View style={globalStyles.cardHeader}>
                <Text style={styles.name}>{employee.first_name} {employee.last_name}</Text>
                <View style={{ flexDirection: "row", gap: SPACING.sm, alignItems: "center" }}>
                    <RoleBadge role={employee.role} />
                    <TerminatedBadge isTerminated={employee.is_terminated} />
                    <StatusBadge isActive={employee.is_active} />
                </View>
            </View>
            <View style={styles.detailsContainer}>
                <DetailRow layout="inline" label="Employee ID: " value={employee.employee_id} />
                <DetailRow layout="inline" label="Role: " value={capitalize(employee.role)} />
                <DetailRow layout="inline" label="Email: " value={employee.email} />
                <DetailRow layout="inline" label="Store ID: " value={employee.store_id} />
            </View>
        </TouchableOpacity>
    );
}
