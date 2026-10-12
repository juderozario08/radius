import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import HeaderComponent from "@/components/common/HeaderComponent";
import BackButton from "@/components/common/BackButton";
import Dropdown from "@/components/common/Dropdown";
import PillGroup from "@/components/common/PillGroup";
import { globalStyles, SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { router, useLocalSearchParams } from "expo-router";

export default function PrintOrderSearchScreen() {
    const params = useLocalSearchParams();
    const activeTab = (params.active_tab as string) || "WEB";

    const [orderType, setOrderType] = useState((params.order_type as string) || "");
    const [orderId, setOrderId] = useState((params.order_id as string) || "");
    const [customerName, setCustomerName] = useState((params.customer_name as string) || "");
    const [customerEmail, setCustomerEmail] = useState((params.customer_email as string) || "");
    const [customerPhone, setCustomerPhone] = useState((params.customer_phone as string) || "");
    const [status, setStatus] = useState((params.status as string) || "");

    const orderTypeOptions = [
        { label: "All", value: "" },
        { label: "Web Orders", value: "WEB" },
        { label: "Walk-In", value: "WALK_IN" },
    ];

    const statusOptions = [
        { label: "All Statuses", value: "" },
        { label: "Pending", value: "PENDING" },
        { label: "In Progress", value: "IN PROGRESS" },
        { label: "Ready for Pickup", value: "READY FOR PICKUP" },
        { label: "Shipped", value: "SHIPPED" },
        { label: "Completed", value: "COMPLETED" },
        { label: "Cancelled", value: "CANCELLED" },
    ];

    const handleApply = () => {
        router.push({
            pathname: "/(app)/(tabs)/home/actions/service/PrintOrders",
            params: {
                order_id: orderId,
                customer_name: customerName,
                customer_email: customerEmail,
                customer_phone: customerPhone,
                status: status,
                order_type: orderType,
                filter: activeTab,
            },
        });
    };

    const handleClear = () => {
        setOrderId("");
        setCustomerName("");
        setCustomerEmail("");
        setCustomerPhone("");
        setStatus("");
        setOrderType("");
    };

    return (
        <TopSafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface }}>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={<Text style={globalStyles.headerTitle}>Advanced Search</Text>}
                headerRight={
                    <TouchableOpacity onPress={handleClear} style={{ padding: SPACING.sm }}>
                        <Text style={{ color: COLORS.primary, fontWeight: "600" }}>Clear</Text>
                    </TouchableOpacity>
                }
            />

            <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
                <Text style={styles.sectionTitle}>Search Filters</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Order Type</Text>
                    <PillGroup
                        options={orderTypeOptions}
                        value={orderType}
                        onChange={setOrderType}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Order Number</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 1"
                        value={orderId}
                        onChangeText={setOrderId}
                        keyboardType="numeric"
                        placeholderTextColor={COLORS.textSecondary}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Customer Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Sarah Jenkins"
                        value={customerName}
                        onChangeText={setCustomerName}
                        placeholderTextColor={COLORS.textSecondary}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Customer Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. customer@example.com"
                        value={customerEmail}
                        onChangeText={setCustomerEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor={COLORS.textSecondary}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Customer Phone</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 416-555-0143"
                        value={customerPhone}
                        onChangeText={setCustomerPhone}
                        keyboardType="phone-pad"
                        placeholderTextColor={COLORS.textSecondary}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Order Status</Text>
                    <View style={styles.dropdownWrapper}>
                        <Dropdown
                            options={statusOptions}
                            value={status}
                            onSelect={setStatus}
                            placeholder="Select a status"
                            style={{ width: "100%" }}
                        />
                    </View>
                </View>

                <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                    <Text style={styles.applyButtonText}>Apply Filters</Text>
                </TouchableOpacity>
                <View style={{ height: 40 }} />
            </ScrollView>
        </TopSafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: SPACING.lg,
        backgroundColor: COLORS.background,
    },
    sectionTitle: {
        fontSize: FONT_SIZE.xl,
        fontWeight: "600",
        color: COLORS.textPrimary,
        marginBottom: SPACING.lg,
    },
    inputGroup: {
        marginBottom: SPACING.lg,
    },
    label: {
        fontSize: FONT_SIZE.md,
        fontWeight: "500",
        color: COLORS.textSecondary,
        marginBottom: SPACING.xsm,
    },
    dropdownWrapper: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md,
    },
    input: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.smd,
        fontSize: FONT_SIZE.lg,
        color: COLORS.textPrimary,
    },
    applyButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.mdl,
        borderRadius: RADIUS.md,
        alignItems: "center",
        marginTop: SPACING.md,
    },
    applyButtonText: {
        color: COLORS.primaryText,
        fontSize: FONT_SIZE.lg,
        fontWeight: "600",
    },
});
