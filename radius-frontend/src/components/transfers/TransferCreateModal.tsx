import { ActionButtonRow } from "@/components/common/ActionButtonRow";
import { transferScreenStyles as styles } from "@/components/transfers/transferScreenStyles";
import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";
import { Product } from "@/types/inventory.types";
import { DestinationStore } from "@/types/receiving.types";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

export interface NewItemEntry {
    product_id: number;
    sku: string;
    upc: string;
    name: string;
    brand: string;
    qty_requested: number;
}

type Props = {
    isCreateModalVisible: boolean;
    setIsCreateModalVisible: (visible: boolean) => void;
    pendingItems: NewItemEntry[];
    destinationStores: DestinationStore[];
    selectedStoreId: number | null;
    setSelectedStoreId: (id: number) => void;
    transferReason: string;
    setTransferReason: (reason: string) => void;
    manualCheck: boolean;
    setManualCheck: (required: boolean) => void;
    productSearchQuery: string;
    handleSearchProducts: (query: string) => void;
    isSearchingProducts: boolean;
    searchResults: Product[];
    selectedProduct: Product | null;
    handleSelectProduct: (product: Product) => void;
    itemQtyText: string;
    setItemQtyText: (qty: string) => void;
    handleAddPendingItem: () => void;
    handleRemovePendingItem: (productId: number) => void;
    isSubmittingCreate: boolean;
    handleSubmitCreateTransfer: () => Promise<void>;
};

export function TransferCreateModal({ isCreateModalVisible, setIsCreateModalVisible, pendingItems, destinationStores, selectedStoreId, setSelectedStoreId, transferReason, setTransferReason, manualCheck, setManualCheck, productSearchQuery, handleSearchProducts, isSearchingProducts, searchResults, selectedProduct, handleSelectProduct, itemQtyText, setItemQtyText, handleAddPendingItem, handleRemovePendingItem, isSubmittingCreate, handleSubmitCreateTransfer }: Props) {
    return (
            <Modal
                visible={isCreateModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setIsCreateModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={globalStyles.modalOverlay}
                >
                    <View style={globalStyles.modalContentWrapper}>
                        <View style={[globalStyles.modalCardContainer, styles.createModalCard]}>
                            <View style={globalStyles.modalHeader}>
                                <Text style={globalStyles.modalName}>New Outbound Transfer</Text>
                                <TouchableOpacity onPress={() => setIsCreateModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                                </TouchableOpacity>
                            </View>

                            <View style={globalStyles.divider} />

                            <FlatList
                                style={styles.createScroll}
                                showsVerticalScrollIndicator={false}
                                data={pendingItems}
                                keyExtractor={(it) => String(it.product_id)}
                                ListHeaderComponent={
                                    <>
                                        <View style={styles.formField}>
                                            <Text style={globalStyles.modalInputLabel}>Destination Store *</Text>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storeListScroll}>
                                                {destinationStores.map((st) => {
                                                    const isSelected = selectedStoreId === st.store_id;
                                                    return (
                                                        <TouchableOpacity
                                                            key={st.store_id}
                                                            style={[styles.storePill, isSelected && styles.storePillSelected]}
                                                            onPress={() => setSelectedStoreId(st.store_id)}
                                                        >
                                                            <Text style={[styles.storePillText, isSelected && styles.storePillTextSelected]}>
                                                                {st.name} ({st.city})
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </ScrollView>
                                        </View>

                                        <View style={styles.formField}>
                                            <Text style={globalStyles.modalInputLabel}>Transfer Reason *</Text>
                                            <TextInput
                                                style={globalStyles.textInput}
                                                placeholder="e.g. Restock, Customer Request, Stock Rebalance"
                                                placeholderTextColor={COLORS.textSecondary}
                                                value={transferReason}
                                                onChangeText={setTransferReason}
                                            />
                                        </View>

                                        <TouchableOpacity
                                            style={styles.toggleRow}
                                            onPress={() => setManualCheck(!manualCheck)}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons
                                                name={manualCheck ? "checkbox" : "square-outline"}
                                                size={22}
                                                color={COLORS.primary}
                                            />
                                            <View style={styles.toggleTextContainer}>
                                                <Text style={styles.toggleTitle}>Require Itemized Scan on Delivery</Text>
                                                <Text style={styles.toggleSubtext}>
                                                    If checked, destination store must scan each item rather than auto-receiving.
                                                </Text>
                                            </View>
                                        </TouchableOpacity>

                                        <View style={globalStyles.divider} />

                                        <View style={styles.formField}>
                                            <Text style={globalStyles.modalInputLabel}>Add Products *</Text>
                                            <View style={styles.productSearchRow}>
                                                <TextInput
                                                    style={[globalStyles.textInput, styles.productSearchInput]}
                                                    placeholder="Search product by name, SKU, UPC..."
                                                    placeholderTextColor={COLORS.textSecondary}
                                                    value={productSearchQuery}
                                                    onChangeText={handleSearchProducts}
                                                />
                                                {isSearchingProducts ? (
                                                    <ActivityIndicator size="small" color={COLORS.primary} style={styles.searchSpinner} />
                                                ) : null}
                                            </View>

                                            {searchResults.length > 0 && (
                                                <View style={styles.searchResultsBox}>
                                                    {searchResults.map((prod) => (
                                                        <TouchableOpacity
                                                            key={prod.product_id}
                                                            style={styles.searchResultItem}
                                                            onPress={() => handleSelectProduct(prod)}
                                                        >
                                                            <Text style={styles.searchResultName} numberOfLines={1}>{prod.name}</Text>
                                                            <Text style={styles.searchResultSku}>SKU: {prod.sku} • Brand: {prod.brand}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            )}

                                            {selectedProduct && (
                                                <View style={styles.selectedProductBox}>
                                                    <View style={styles.selectedProductInfo}>
                                                        <Text style={styles.selectedProductName} numberOfLines={1}>{selectedProduct.name}</Text>
                                                        <Text style={styles.selectedProductSku}>SKU: {selectedProduct.sku}</Text>
                                                    </View>
                                                    <View style={styles.qtyAddRow}>
                                                        <Text style={styles.qtyLabel}>Qty:</Text>
                                                        <TextInput
                                                            style={styles.qtyInput}
                                                            keyboardType="number-pad"
                                                            value={itemQtyText}
                                                            onChangeText={setItemQtyText}
                                                        />
                                                        <TouchableOpacity style={styles.addBtn} onPress={handleAddPendingItem}>
                                                            <Text style={styles.addBtnText}>Add</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            )}
                                        </View>

                                        <View style={styles.pendingItemsSection}>
                                            <Text style={styles.pendingItemsTitle}>
                                                Transfer Manifest ({pendingItems.length} {pendingItems.length === 1 ? "item" : "items"})
                                            </Text>
                                        </View>
                                    </>
                                }
                                renderItem={({ item: it }) => (
                                    <View style={styles.manifestItemRow}>
                                        <View style={styles.manifestItemLeft}>
                                            <Text style={styles.manifestItemName} numberOfLines={1}>{it.name}</Text>
                                            <Text style={styles.manifestItemSku}>SKU: {it.sku} • Qty: {it.qty_requested}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => handleRemovePendingItem(it.product_id)}>
                                            <Ionicons name="trash-outline" size={20} color={COLORS.dangerDark} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                                ListEmptyComponent={
                                    <Text style={styles.emptyPendingText}>No products added to manifest yet.</Text>
                                }
                            />

                            <View style={globalStyles.divider} />

                            <ActionButtonRow
                                buttons={[
                                    {
                                        key: "cancel-create",
                                        label: "Cancel",
                                        kind: "neutral",
                                        onPress: () => setIsCreateModalVisible(false),
                                        disabled: isSubmittingCreate,
                                    },
                                    {
                                        key: "submit-create",
                                        label: isSubmittingCreate ? "Creating..." : "Create Transfer",
                                        kind: "primary",
                                        onPress: handleSubmitCreateTransfer,
                                        loading: isSubmittingCreate,
                                        disabled: pendingItems.length === 0 || !selectedStoreId,
                                    },
                                ]}
                            />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
    );
}
