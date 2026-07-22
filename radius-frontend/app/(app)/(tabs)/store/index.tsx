// radius-frontend/app/(app)/store/index.tsx
import { apiFetch, UnauthorizedError } from "@/api/client";
import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { COLORS } from "@/constants/colors";
import { ENDPOINTS } from "@/constants/routes";
import { globalStyles } from "@/constants/styles";
import { useAuth } from "@/hooks/useAuth";
import { showToast } from "@/utils/helpers";
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
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import CustomToast from "@/components/common/Toast";
import { Store, GetAllStoresResponse } from "@/types/admin.types";

type FormMode = "create" | "edit";
interface PillOption<T> {
    label: string;
    value: T;
}

const STATUS_OPTIONS: PillOption<boolean>[] = [
    { label: "Active", value: true },
    { label: "Inactive", value: false },
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

const formValuesToStore = (formValues: StoreFormValues, base: Store): Store => ({
    ...base,
    name: formValues.name,
    address: formValues.address,
    city: formValues.city,
    province: formValues.province,
    postal_code: formValues.postal_code,
    phone: formValues.phone,
    timezone: formValues.timezone,
    is_active: formValues.is_active,
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

interface StoreDetailModalProps {
    store: Store | null;
    visible: boolean;
    onClose: () => void;
    onEdit: (store: Store) => void;
    onStatusChange: () => void;
}

const StoreDetailModal: React.FC<StoreDetailModalProps> = ({ store, visible, onClose, onEdit, onStatusChange }) => {
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

        if (result !== null) {
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
                            <View>
                                <Text style={globalStyles.modalName}>{store.name}</Text>
                                <Text style={globalStyles.modalRole}>ID: {store.store_id}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                <StatusBadge isActive={store.is_active} />
                            </View>
                        </View>

                        <View style={globalStyles.divider} />

                        <View style={globalStyles.section}>
                            <Text style={globalStyles.sectionTitle}>Contact & Location</Text>
                            <DetailRow label="Phone:" value={store.phone} />
                            <Text style={[globalStyles.emptyText, { marginTop: 8 }]}>{store.address}</Text>
                            <Text style={globalStyles.emptyText}>{store.city}, {store.province} {store.postal_code}</Text>
                        </View>

                        <View style={globalStyles.divider} />

                        <View style={globalStyles.section}>
                            <Text style={globalStyles.sectionTitle}>System Details</Text>
                            <DetailRow label="Timezone:" value={store.timezone} />
                        </View>
                    </View>

                    <ActionButtonRow
                        buttons={[
                            { key: "close", label: "Close", kind: "neutral", onPress: onClose, disabled: isUpdatingStatus },
                            { key: "edit", label: "Edit", kind: "accent", onPress: () => onEdit(store), disabled: isUpdatingStatus },
                            store.is_active ?
                                { key: "deactivate", label: "Deactivate", kind: "danger", onPress: handleToggleStatusPress, loading: isUpdatingStatus } :
                                { key: "activate", label: "Activate", kind: "primary", onPress: handleToggleStatusPress, loading: isUpdatingStatus },
                        ]}
                    />
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
    onSuccess: (updatedStore?: Store) => void;
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
        const { name, phone, address, city, province, postal_code } = formValues;
        const missingRequired = !name || !phone || !address || !city || !province || !postal_code;

        if (missingRequired) {
            showToast("error", "Please fill in all required fields");
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!isFormValid()) return;

        const payload: Record<string, any> = { ...formValues };

        if (isEditMode && store) {
            payload.store_id = store.store_id;
        }

        setIsSubmitting(true);
        const endpoint = isEditMode ? ENDPOINTS.AUTHENTICATED.ADMIN.STORE.update : ENDPOINTS.AUTHENTICATED.ADMIN.STORE.create;
        const result = await callApi(endpoint, { method: isEditMode ? "PUT" : "POST", body: payload }, logout);
        setIsSubmitting(false);

        if (result !== null) {
            showToast("success", isEditMode ? "Store updated successfully!" : "Store created successfully!");
            onSuccess((isEditMode && store) ? formValuesToStore(formValues, store) : undefined);
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
                                autoCapitalize="characters"
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

    const [selectedStore, setSelectedStore] = useState<Store | null>(null);
    const [detailModalVisible, setDetailModalVisible] = useState(false);

    const [formModalVisible, setFormModalVisible] = useState(false);
    const [formMode, setFormMode] = useState<FormMode>("create");

    useEffect(() => {
        fetchStores();
    }, []);

    const fetchStores = async () => {
        setIsLoading(true);
        setError(null);

        const data = await callApi<GetAllStoresResponse>(ENDPOINTS.AUTHENTICATED.ADMIN.STORE.getAll, { method: "GET" }, logout);

        if (data) {
            showToast("success", data.message || "Stores loaded");
            setStores(data.stores || []);
        } else {
            setError("Could not load stores. Please try again.");
        }
        setIsLoading(false);
    };

    const handleViewStore = (store: Store) => {
        setSelectedStore(store);
        setDetailModalVisible(true);
    };

    const handleCloseDetailModal = () => {
        setDetailModalVisible(false);
        setSelectedStore(null);
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

    const handleFormSuccess = (updatedStore?: Store) => {
        fetchStores();
        setFormModalVisible(false);
        if (formMode === "edit") {
            if (updatedStore) setSelectedStore(updatedStore);
            setDetailModalVisible(true);
        }
    };

    const renderStoreCard = ({ item }: { item: Store }) => (
        <TouchableOpacity style={globalStyles.card} activeOpacity={0.7} onPress={() => handleViewStore(item)}>
            <View style={globalStyles.cardHeader}>
                <Text style={styles.name}>
                    {item.name}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <StatusBadge isActive={item.is_active} />
                </View>
            </View>

            <View style={styles.detailsContainer}>
                <DetailRow layout="inline" label="City: " value={`${item.city}, ${item.province}`} />
                <DetailRow layout="inline" label="Phone: " value={item.phone} />
            </View>
        </TouchableOpacity>
    );

    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={<Text style={globalStyles.headerTitle}>Stores</Text>}
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
                ) : stores.length === 0 ? (
                    <Text style={globalStyles.emptyText}>No stores found.</Text>
                ) : (
                    <FlatList
                        data={stores}
                        keyExtractor={(item) => item.store_id.toString()}
                        style={{ backgroundColor: COLORS.background }}
                        renderItem={renderStoreCard}
                        contentContainerStyle={globalStyles.listContainer}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

            <StoreDetailModal
                store={selectedStore}
                visible={detailModalVisible}
                onClose={handleCloseDetailModal}
                onEdit={handleOpenEditForm}
                onStatusChange={fetchStores}
            />

            <StoreFormModal
                visible={formModalVisible}
                mode={formMode}
                store={formMode === "edit" ? selectedStore : null}
                onBack={handleFormBack}
                onSuccess={handleFormSuccess}
            />
        </TopSafeAreaView>
    );
}

const styles = StyleSheet.create({
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
