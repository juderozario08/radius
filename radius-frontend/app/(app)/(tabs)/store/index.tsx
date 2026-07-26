// radius-frontend/app/(app)/store/index.tsx
import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { ENDPOINTS } from "@/constants/routes";
import { globalStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
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
    View
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import CustomToast from "@/components/common/Toast";
import { callApi, showToast } from "@/utils/helpers";
import { GetAllStoresResponse, Store } from "@/types/admin.types";
import PillGroup, { PillOption } from "@/components/common/PillGroup";
import Pagination from "@/components/common/Pagination";
import { CANADIAN_PROVINCES, isCanadianProvince, normalizeCanadianPostalCode } from "@/constants/canada";

type FormMode = "create" | "edit";

const STATUS_OPTIONS: PillOption<boolean>[] = [
    { label: "Active", value: true },
    { label: "Inactive", value: false },
];

interface StoreFormValues {
    name: string;
    address: string;
    city: string;
    province: string;
    postal_code: string;
    phone: string;
    timezone: string;
    is_active: boolean;
}

const createEmptyFormValues = (): StoreFormValues => ({
    name: "", address: "", city: "", province: "", postal_code: "", phone: "", timezone: "America/Toronto", is_active: true,
});

const storeToFormValues = (store: Store): StoreFormValues => ({
    name: store.name,
    address: store.address,
    city: store.city,
    province: store.province,
    postal_code: store.postal_code,
    phone: store.phone,
    timezone: store.timezone ?? "America/Toronto",
    is_active: store.is_active ?? true,
});

const StoreDetailModal: React.FC<{
    store: Store | null;
    visible: boolean;
    onClose: () => void;
    onEdit: (store: Store) => void;
    onStatusChange: () => void;
}> = ({ store, visible, onClose, onEdit, onStatusChange }) => {
    const { logout } = useAuth();
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    if (!store) return null;

    const confirmToggleStatus = async () => {
        setIsUpdatingStatus(true);
        const endpoint = store.is_active
            ? ENDPOINTS.AUTHENTICATED.ADMIN.STORE.deactivate
            : ENDPOINTS.AUTHENTICATED.ADMIN.STORE.activate;

        const result = await callApi(
            endpoint,
            { method: "POST", body: { store_id: store.store_id } },
            logout
        );
        setIsUpdatingStatus(false);

        if (result) {
            showToast("success", `Store ${store.is_active ? 'deactivated' : 'activated'}`);
            onStatusChange();
            onClose();
        }
    };

    const handleToggleStatusPress = () => {
        const action = store.is_active ? "Deactivate" : "Activate";
        Alert.alert(
            `${action} Store`,
            `Are you sure you want to ${action.toLowerCase()} ${store.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                { text: action, style: store.is_active ? "destructive" : "default", onPress: confirmToggleStatus },
            ]
        );
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={globalStyles.modalOverlay}>
                <View style={globalStyles.modalContentWrapper}>
                    <View style={globalStyles.modalCardContainer}>
                        <View style={globalStyles.modalHeader}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={globalStyles.modalName}>{store.name}</Text>
                                <Text style={globalStyles.modalRole}>Store ID: {store.store_id}</Text>
                            </View>
                            <StatusBadge isActive={store.is_active} />
                        </View>
                        <View style={globalStyles.divider} />
                        <View style={globalStyles.section}>
                            <Text style={globalStyles.sectionTitle}>Location Details</Text>
                            <DetailRow label="Address:" value={`${store.address}, ${store.city}, ${store.province}`} />
                            <DetailRow label="Postal Code:" value={store.postal_code} />
                            <DetailRow label="Timezone:" value={store.timezone} />
                        </View>
                        <View style={globalStyles.divider} />
                        <View style={globalStyles.section}>
                            <Text style={globalStyles.sectionTitle}>Contact & Info</Text>
                            <DetailRow label="Phone:" value={store.phone} />
                            <DetailRow label="Created At:" value={new Date(store.created_at).toLocaleDateString()} />
                        </View>
                    </View>
                    <ActionButtonRow buttons={[
                        { key: "close", label: "Close", kind: "neutral", onPress: onClose, disabled: isUpdatingStatus },
                        { key: "edit", label: "Edit", kind: "accent", onPress: () => onEdit(store), disabled: isUpdatingStatus },
                        store.is_active ?
                            { key: "deactivate", label: "Deactivate", kind: "danger", onPress: handleToggleStatusPress, loading: isUpdatingStatus } :
                            { key: "activate", label: "Activate", kind: "primary", onPress: handleToggleStatusPress, loading: isUpdatingStatus },
                    ]} />
                </View>
            </View>
            <CustomToast />
        </Modal>
    );
};

interface StoreFormModalProps {
    visible: boolean;
    mode: FormMode;
    store?: Store | null;
    onBack: () => void;
    onSuccess: () => void;
}

const StoreFormModal: React.FC<StoreFormModalProps> = ({ visible, mode, store, onBack, onSuccess }) => {
    const { logout } = useAuth();
    const [formValues, setFormValues] = useState<StoreFormValues>(createEmptyFormValues());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditMode = mode === "edit";

    useEffect(() => {
        if (!visible) return;
        setFormValues(isEditMode && store ? storeToFormValues(store) : createEmptyFormValues());
    }, [visible, isEditMode, store]);

    const updateField = <K extends keyof StoreFormValues>(key: K, value: StoreFormValues[K]) => {
        setFormValues((prev) => ({ ...prev, [key]: value }));
    };

    const isFormValid = (): boolean => {
        const { name, phone, address, city, province, postal_code, timezone } = formValues;
        const missingRequired = !name || !phone || !address || !city || !province || !postal_code || !timezone;

        if (missingRequired) {
            showToast("error", "Please fill in all required fields");
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

        return true;
    };

    const handleSubmit = async () => {
        if (!isFormValid()) return;

        const payload: Record<string, any> = {
            ...formValues,
            postal_code: normalizeCanadianPostalCode(formValues.postal_code),
        };
        if (isEditMode && store) {
            payload.store_id = store.store_id;
        }

        setIsSubmitting(true);
        const endpoint = isEditMode ? ENDPOINTS.AUTHENTICATED.ADMIN.STORE.update : ENDPOINTS.AUTHENTICATED.ADMIN.STORE.create;
        const result = await callApi(endpoint, { method: isEditMode ? "PUT" : "POST", body: payload }, logout);
        setIsSubmitting(false);

        if (result !== null) {
            showToast("success", isEditMode ? "Store updated successfully!" : "Store created successfully!");
            onSuccess();
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onBack}>
            <KeyboardAvoidingView style={globalStyles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <View style={[globalStyles.modalContentWrapper, { maxHeight: "85%" }]}>
                    <View style={[styles.formHeader, isEditMode && styles.formHeaderEdit]}>
                        <Text style={globalStyles.modalName}>{isEditMode ? "Edit Store" : "Create Store"}</Text>
                    </View>

                    <ScrollView style={[styles.formContainer, { backgroundColor: COLORS.background }]} showsVerticalScrollIndicator>
                        <Text style={styles.inputLabel}>Store Details *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Store Name"
                            value={formValues.name}
                            onChangeText={(text) => updateField("name", text)}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number"
                            keyboardType="phone-pad"
                            value={formValues.phone}
                            onChangeText={(text) => updateField("phone", text)}
                        />

                        <Text style={styles.inputLabel}>Location *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Street Address"
                            value={formValues.address}
                            onChangeText={(text) => updateField("address", text)}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="City"
                            value={formValues.city}
                            onChangeText={(text) => updateField("city", text)}
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
                        />

                        <Text style={styles.inputLabel}>System Configuration</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Timezone (e.g. America/Toronto)"
                            value={formValues.timezone}
                            autoCapitalize="none"
                            onChangeText={(text) => updateField("timezone", text)}
                        />

                        <Text style={styles.inputLabel}>Status *</Text>
                        <PillGroup options={STATUS_OPTIONS} value={formValues.is_active} onChange={(v) => updateField("is_active", v)} />
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

export default function Stores() {
    const { logout } = useAuth();
    const [stores, setStores] = useState<Store[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination State
    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalLength, setTotalLength] = useState(0);

    const [selectedStore, setSelectedStore] = useState<Store | null>(null);
    const [detailModalVisible, setDetailModalVisible] = useState(false);

    const [formModalVisible, setFormModalVisible] = useState(false);
    const [formMode, setFormMode] = useState<FormMode>("create");

    useEffect(() => {
        fetchStores(pageNumber, pageSize);
    }, [pageNumber, pageSize]);

    const fetchStores = async (page: number, limit: number) => {
        setIsLoading(true);
        setError(null);

        const endpoint = `${ENDPOINTS.AUTHENTICATED.ADMIN.STORE.getAll}?page_size=${limit}&page_number=${page}`;
        const data = await callApi<GetAllStoresResponse>(endpoint, { method: "GET" }, logout);

        if (data) {
            setStores(data.stores || []);
            setTotalLength(data.total_length || 0);
        } else {
            setError("Could not load stores. Please try again.");
        }
        setIsLoading(false);
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setPageNumber(1); // Reset to page 1 whenever page size changes
    };

    const handleOpenCreateForm = () => {
        setFormMode("create");
        setFormModalVisible(true);
    };

    const handleOpenEditForm = (store: Store) => {
        setSelectedStore(store);
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

    const handleFormSuccess = () => {
        fetchStores(pageNumber, pageSize);
        setFormModalVisible(false);
        setDetailModalVisible(false);
    };

    const renderStoreCard = ({ item }: { item: Store }) => (
        <TouchableOpacity style={globalStyles.card} activeOpacity={0.7} onPress={() => { setSelectedStore(item); setDetailModalVisible(true); }}>
            <View style={globalStyles.cardHeader}>
                <Text style={styles.name}>{item.name}</Text>
                <StatusBadge isActive={item.is_active} />
            </View>
            <View style={styles.detailsContainer}>
                {/* Store ID Added here */}
                <DetailRow layout="inline" label="Store ID: " value={item.store_id} />
                <DetailRow layout="inline" label="City: " value={`${item.city}, ${item.province}`} />
                <DetailRow layout="inline" label="Phone: " value={item.phone} />
                <DetailRow layout="inline" label="Timezone: " value={item.timezone} />
            </View>
        </TouchableOpacity>
    );

    const totalPages = Math.max(1, Math.ceil(totalLength / pageSize));

    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={<Text style={globalStyles.headerTitle}>Company Stores</Text>}
                headerRight={
                    <TouchableOpacity onPress={handleOpenCreateForm}>
                        <Image source={require("@/assets/images/plus.png")} style={globalStyles.headerImageSize} />
                    </TouchableOpacity>
                }
            />

            <View style={[globalStyles.container, styles.listWrapper]}>
                {isLoading && stores.length === 0 ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={globalStyles.centerElement} />
                ) : error ? (
                    <Text style={globalStyles.errorText}>{error}</Text>
                ) : (
                    <>
                        {/*
                          By rendering the FlatList vs the empty text side-by-side but leaving
                          the Pagination OUTSIDE of the emptiness check, the pagination controls
                          will always stay glued to the bottom so users can back out of empty pages.
                        */}
                        {stores.length === 0 ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={globalStyles.emptyText}>No stores found.</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={stores}
                                keyExtractor={(item) => item.store_id.toString()}
                                renderItem={renderStoreCard}
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

            <StoreDetailModal
                store={selectedStore}
                visible={detailModalVisible}
                onClose={() => setDetailModalVisible(false)}
                onEdit={handleOpenEditForm}
                onStatusChange={() => fetchStores(pageNumber, pageSize)}
            />

            <StoreFormModal
                visible={formModalVisible}
                mode={formMode}
                store={formMode === "edit" ? selectedStore : null}
                onBack={handleFormBack}
                onSuccess={handleFormSuccess}
            />

            <CustomToast />
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
    // Form specific styles
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
});
