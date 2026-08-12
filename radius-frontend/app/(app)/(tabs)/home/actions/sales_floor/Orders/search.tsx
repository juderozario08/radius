import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import HeaderComponent from "@/components/common/HeaderComponent";
import BackButton from "@/components/common/BackButton";
import Dropdown from "@/components/common/Dropdown";
import PillGroup from "@/components/common/PillGroup";
import { globalStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { router, useLocalSearchParams } from "expo-router";

export default function OrderSearchScreen() {
    const params = useLocalSearchParams();
    const activeTab = params.active_tab as string || "BOPIS"; // To preserve tab

    const [orderType, setOrderType] = useState(params.order_type as string || "");
    const [orderId, setOrderId] = useState(params.order_id as string || "");
    const [customerFirstName, setCustomerFirstName] = useState(params.customer_first_name as string || "");
    const [customerLastName, setCustomerLastName] = useState(params.customer_last_name as string || "");
    const [customerEmail, setCustomerEmail] = useState(params.customer_email as string || "");
    const [sku, setSku] = useState(params.sku as string || "");
    const [billingPhone, setBillingPhone] = useState(params.billing_phone as string || "");
    const [paymentCard, setPaymentCard] = useState(params.payment_card as string || "");
    const [status, setStatus] = useState(params.status as string || "");

    const orderTypeOptions = [
        { label: "All", value: "" },
        { label: "BOPIS", value: "BOPIS" },
        { label: "STS", value: "STS" }
    ];

    const bopisStatuses = [
        { label: "All Statuses", value: "" },
        { label: "Ready for Pickup", value: "READY FOR PICKUP" },
        { label: "Awaiting Pickup", value: "AWAITING PICKUP" },
        { label: "Released", value: "RELEASED" }
    ];

    const stsStatuses = [
        { label: "All Statuses", value: "" },
        { label: "Work in Progress", value: "WORK IN PROGRESS" },
        { label: "Shipped", value: "SHIPPED" },
        { label: "Delivering", value: "DELIVERING" },
        { label: "Delivered", value: "DELIVERED" },
        { label: "Awaiting Pickup", value: "AWAITING PICKUP" }
    ];

    // Decide which statuses to show based on selected order type, or fallback to activeTab if no explicit filter
    const displayType = orderType || activeTab;
    const statusOptions = displayType === "STS" ? stsStatuses : bopisStatuses;

    const handleApply = () => {
        router.push({
            pathname: "/(app)/(tabs)/home/actions/sales_floor/Orders",
            params: {
                order_id: orderId,
                customer_first_name: customerFirstName,
                customer_last_name: customerLastName,
                customer_email: customerEmail,
                sku: sku,
                billing_phone: billingPhone,
                payment_card: paymentCard,
                status: status,
                order_type: orderType,
                filter: activeTab // preserve the tab
            }
        });
    };

    const handleClear = () => {
        setOrderId("");
        setCustomerFirstName("");
        setCustomerLastName("");
        setCustomerEmail("");
        setSku("");
        setBillingPhone("");
        setPaymentCard("");
        setStatus("");
        setOrderType("");
    };

    return (
        <TopSafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface }}>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={<Text style={globalStyles.headerTitle}>Advanced Search</Text>}
                headerRight={
                    <TouchableOpacity onPress={handleClear} style={{ padding: 8 }}>
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
                        placeholder="e.g. 12345"
                        value={orderId}
                        onChangeText={setOrderId}
                        keyboardType="numeric"
                        placeholderTextColor={COLORS.textSecondary}
                    />
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.label}>First Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. John"
                            value={customerFirstName}
                            onChangeText={setCustomerFirstName}
                            placeholderTextColor={COLORS.textSecondary}
                        />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.label}>Last Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Doe"
                            value={customerLastName}
                            onChangeText={setCustomerLastName}
                            placeholderTextColor={COLORS.textSecondary}
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Customer Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. john@example.com"
                        value={customerEmail}
                        onChangeText={setCustomerEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor={COLORS.textSecondary}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Product SKU</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 100456"
                        value={sku}
                        onChangeText={setSku}
                        placeholderTextColor={COLORS.textSecondary}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Billing Phone</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 4165551234"
                        value={billingPhone}
                        onChangeText={setBillingPhone}
                        keyboardType="phone-pad"
                        placeholderTextColor={COLORS.textSecondary}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Payment Card (Last 4)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 4242"
                        value={paymentCard}
                        onChangeText={setPaymentCard}
                        keyboardType="numeric"
                        maxLength={4}
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
        padding: 16,
        backgroundColor: COLORS.background,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: COLORS.textPrimary,
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.textSecondary,
        marginBottom: 6,
    },
    dropdownWrapper: {
        backgroundColor: COLORS.surface,
        borderRadius: 8,
    },
    input: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: COLORS.textPrimary,
    },
    applyButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 12,
    },
    applyButtonText: {
        color: COLORS.primaryText,
        fontSize: 16,
        fontWeight: "600",
    }
});
