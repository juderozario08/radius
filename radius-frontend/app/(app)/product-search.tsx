// radius-frontend/app/(app)/product-search.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Image,
    Animated,
    Modal,
    ScrollView,
    Keyboard,
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import HeaderComponent from "@/components/common/HeaderComponent";
import BackButton from "@/components/common/BackButton";
import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";
import { ENDPOINTS } from "@/constants/routes";
import { callApi } from "@/utils/helpers";
import { useAuth } from "@/hooks/useAuth";
import { router } from "expo-router";
import { Product, SearchProductsResponse, Category, SearchFilters } from "@/types/inventory.types";
import { Ionicons } from "@expo/vector-icons";
import { StatusBadge } from "@/components/common/StatusBadge";

const PAGE_SIZE = 25;

// --- Filter Panel Component ---
function FilterPanel({
    visible,
    onClose,
    filters,
    onApply,
    categories,
    brands,
}: {
    visible: boolean;
    onClose: () => void;
    filters: SearchFilters;
    onApply: (filters: SearchFilters) => void;
    categories: Category[];
    brands: string[];
}) {
    const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [showBrandPicker, setShowBrandPicker] = useState(false);
    const [brandSearch, setBrandSearch] = useState("");

    useEffect(() => {
        if (visible) setLocalFilters(filters);
    }, [visible]);

    const selectedCategory = categories.find(c => c.category_id === localFilters.category_id);

    const filteredBrands = brandSearch
        ? brands.filter(b => b.toLowerCase().includes(brandSearch.toLowerCase()))
        : brands;

    const activeFilterCount = [
        localFilters.category_id,
        localFilters.brand,
        localFilters.is_active !== undefined ? true : undefined,
        localFilters.unit_of_measure,
    ].filter(Boolean).length;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={filterStyles.overlay}>
                <View style={filterStyles.container}>
                    {/* Header */}
                    <View style={filterStyles.header}>
                        <Text style={filterStyles.title}>Filters</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={filterStyles.body} showsVerticalScrollIndicator={false}>
                        {/* Category Filter */}
                        <Text style={filterStyles.label}>Category</Text>
                        <TouchableOpacity
                            style={filterStyles.pickerButton}
                            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                        >
                            <Text style={[
                                filterStyles.pickerText,
                                !selectedCategory && { color: COLORS.placeholder },
                            ]}>
                                {selectedCategory ? selectedCategory.name : "All Categories"}
                            </Text>
                            <Ionicons
                                name={showCategoryPicker ? "chevron-up" : "chevron-down"}
                                size={18}
                                color={COLORS.textSecondary}
                            />
                        </TouchableOpacity>
                        {showCategoryPicker && (
                            <View style={filterStyles.pickerList}>
                                <TouchableOpacity
                                    style={[filterStyles.pickerItem, !localFilters.category_id && filterStyles.pickerItemSelected]}
                                    onPress={() => {
                                        setLocalFilters(f => ({ ...f, category_id: undefined }));
                                        setShowCategoryPicker(false);
                                    }}
                                >
                                    <Text style={[filterStyles.pickerItemText, !localFilters.category_id && filterStyles.pickerItemTextSelected]}>All Categories</Text>
                                </TouchableOpacity>
                                {categories.map(cat => (
                                    <TouchableOpacity
                                        key={cat.category_id}
                                        style={[filterStyles.pickerItem, localFilters.category_id === cat.category_id && filterStyles.pickerItemSelected]}
                                        onPress={() => {
                                            setLocalFilters(f => ({ ...f, category_id: cat.category_id }));
                                            setShowCategoryPicker(false);
                                        }}
                                    >
                                        <Text style={[filterStyles.pickerItemText, localFilters.category_id === cat.category_id && filterStyles.pickerItemTextSelected]}>
                                            {cat.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Brand Filter */}
                        <Text style={[filterStyles.label, { marginTop: 20 }]}>Brand</Text>
                        <TouchableOpacity
                            style={filterStyles.pickerButton}
                            onPress={() => setShowBrandPicker(!showBrandPicker)}
                        >
                            <Text style={[
                                filterStyles.pickerText,
                                !localFilters.brand && { color: COLORS.placeholder },
                            ]}>
                                {localFilters.brand || "All Brands"}
                            </Text>
                            <Ionicons
                                name={showBrandPicker ? "chevron-up" : "chevron-down"}
                                size={18}
                                color={COLORS.textSecondary}
                            />
                        </TouchableOpacity>
                        {showBrandPicker && (
                            <View style={filterStyles.pickerList}>
                                <TextInput
                                    style={filterStyles.brandSearchInput}
                                    placeholder="Search brands..."
                                    placeholderTextColor={COLORS.placeholder}
                                    value={brandSearch}
                                    onChangeText={setBrandSearch}
                                />
                                <TouchableOpacity
                                    style={[filterStyles.pickerItem, !localFilters.brand && filterStyles.pickerItemSelected]}
                                    onPress={() => {
                                        setLocalFilters(f => ({ ...f, brand: undefined }));
                                        setShowBrandPicker(false);
                                        setBrandSearch("");
                                    }}
                                >
                                    <Text style={[filterStyles.pickerItemText, !localFilters.brand && filterStyles.pickerItemTextSelected]}>All Brands</Text>
                                </TouchableOpacity>
                                <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
                                    {filteredBrands.map(b => (
                                        <TouchableOpacity
                                            key={b}
                                            style={[filterStyles.pickerItem, localFilters.brand === b && filterStyles.pickerItemSelected]}
                                            onPress={() => {
                                                setLocalFilters(f => ({ ...f, brand: b }));
                                                setShowBrandPicker(false);
                                                setBrandSearch("");
                                            }}
                                        >
                                            <Text style={[filterStyles.pickerItemText, localFilters.brand === b && filterStyles.pickerItemTextSelected]}>{b}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* Status Filter */}
                        <Text style={[filterStyles.label, { marginTop: 20 }]}>Status</Text>
                        <View style={filterStyles.chipRow}>
                            <TouchableOpacity
                                style={[filterStyles.chip, localFilters.is_active === undefined && filterStyles.chipActive]}
                                onPress={() => setLocalFilters(f => ({ ...f, is_active: undefined }))}
                            >
                                <Text style={[filterStyles.chipText, localFilters.is_active === undefined && filterStyles.chipTextActive]}>All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[filterStyles.chip, localFilters.is_active === true && filterStyles.chipActive]}
                                onPress={() => setLocalFilters(f => ({ ...f, is_active: true }))}
                            >
                                <Text style={[filterStyles.chipText, localFilters.is_active === true && filterStyles.chipTextActive]}>Active</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[filterStyles.chip, localFilters.is_active === false && filterStyles.chipActive]}
                                onPress={() => setLocalFilters(f => ({ ...f, is_active: false }))}
                            >
                                <Text style={[filterStyles.chipText, localFilters.is_active === false && filterStyles.chipTextActive]}>Inactive</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Unit of Measure Filter */}
                        <Text style={[filterStyles.label, { marginTop: 20 }]}>Unit of Measure</Text>
                        <View style={filterStyles.chipRow}>
                            {[undefined, "EACH", "CASE", "PACK"].map((uom) => (
                                <TouchableOpacity
                                    key={uom ?? "all"}
                                    style={[filterStyles.chip, localFilters.unit_of_measure === uom && filterStyles.chipActive]}
                                    onPress={() => setLocalFilters(f => ({ ...f, unit_of_measure: uom }))}
                                >
                                    <Text style={[filterStyles.chipText, localFilters.unit_of_measure === uom && filterStyles.chipTextActive]}>
                                        {uom ?? "All"}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    {/* Footer */}
                    <View style={filterStyles.footer}>
                        <TouchableOpacity
                            style={filterStyles.clearButton}
                            onPress={() => setLocalFilters({})}
                        >
                            <Text style={filterStyles.clearButtonText}>Clear All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={filterStyles.applyButton}
                            onPress={() => {
                                onApply(localFilters);
                                onClose();
                            }}
                        >
                            <Text style={filterStyles.applyButtonText}>
                                Apply{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// --- Product Card Component ---
function ProductCard({ product, onPress }: { product: Product; onPress: () => void }) {
    return (
        <TouchableOpacity style={styles.productCard} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.productCardHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                    <Text style={styles.productBrand}>{product.brand}</Text>
                </View>
                <StatusBadge isActive={product.is_active} />
            </View>
            <View style={styles.productMeta}>
                <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>SKU</Text>
                    <Text style={styles.metaValue}>{product.sku}</Text>
                </View>
                <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>UPC</Text>
                    <Text style={styles.metaValue}>{product.upc}</Text>
                </View>
                <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Unit</Text>
                    <Text style={styles.metaValue}>{product.unit_of_measure}</Text>
                </View>
            </View>
            {product.description ? (
                <Text style={styles.productDescription} numberOfLines={2}>{product.description}</Text>
            ) : null}
            <View style={styles.cardArrow}>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
            </View>
        </TouchableOpacity>
    );
}

// --- Main Search Screen ---
export default function ProductSearchScreen() {
    const { logout } = useAuth();
    const [searchText, setSearchText] = useState("");
    const [products, setProducts] = useState<Product[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasSearched, setHasSearched] = useState(false);

    // Filter state
    const [filters, setFilters] = useState<SearchFilters>({});
    const [showFilters, setShowFilters] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [brands, setBrands] = useState<string[]>([]);

    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchInputRef = useRef<TextInput>(null);

    // Load filter options on mount
    useEffect(() => {
        loadFilterOptions();
        // Auto-focus the search input
        setTimeout(() => searchInputRef.current?.focus(), 300);
    }, []);

    const loadFilterOptions = async () => {
        const [cats, brnds] = await Promise.all([
            callApi<Category[]>(ENDPOINTS.AUTHENTICATED.PRODUCTS.categories, { method: "GET" }, logout),
            callApi<string[]>(ENDPOINTS.AUTHENTICATED.PRODUCTS.brands, { method: "GET" }, logout),
        ]);
        if (cats) setCategories(cats);
        if (brnds) setBrands(brnds);
    };

    const searchProducts = useCallback(async (query: string, activeFilters: SearchFilters, pageOffset: number = 0) => {
        if (pageOffset === 0) {
            setIsLoading(true);
        } else {
            setIsLoadingMore(true);
        }

        const params = new URLSearchParams();
        if (query) params.append("q", query);
        if (activeFilters.category_id) params.append("category_id", String(activeFilters.category_id));
        if (activeFilters.brand) params.append("brand", activeFilters.brand);
        if (activeFilters.is_active !== undefined) params.append("is_active", String(activeFilters.is_active));
        if (activeFilters.unit_of_measure) params.append("unit_of_measure", activeFilters.unit_of_measure);
        params.append("limit", String(PAGE_SIZE));
        params.append("offset", String(pageOffset));

        const endpoint = `${ENDPOINTS.AUTHENTICATED.PRODUCTS.search}?${params.toString()}`;
        const data = await callApi<SearchProductsResponse>(endpoint, { method: "GET" }, logout);

        if (data) {
            if (pageOffset === 0) {
                setProducts(data.products);
            } else {
                setProducts(prev => [...prev, ...data.products]);
            }
            setTotal(data.total);
            setOffset(pageOffset + PAGE_SIZE);
        }

        setHasSearched(true);
        setIsLoading(false);
        setIsLoadingMore(false);
    }, [logout]);

    // Debounced search on text change
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            searchProducts(searchText, filters, 0);
        }, 300);
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [searchText, filters]);

    const handleLoadMore = () => {
        if (!isLoadingMore && !isLoading && products.length < total) {
            searchProducts(searchText, filters, offset);
        }
    };

    const handleApplyFilters = (newFilters: SearchFilters) => {
        setFilters(newFilters);
        // Search will be triggered by useEffect on filters change
    };

    const activeFilterCount = [
        filters.category_id,
        filters.brand,
        filters.is_active !== undefined ? true : undefined,
        filters.unit_of_measure,
    ].filter(Boolean).length;

    const renderProduct = ({ item }: { item: Product }) => (
        <ProductCard
            product={item}
            onPress={() => router.push(`/(app)/product/${item.product_id}` as any)}
        />
    );

    const renderEmpty = () => {
        if (isLoading) return null;
        if (!hasSearched) return null;
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={56} color={COLORS.border} />
                <Text style={styles.emptyTitle}>No products found</Text>
                <Text style={styles.emptySubtitle}>
                    Try a different search term or adjust your filters
                </Text>
            </View>
        );
    };

    const renderFooter = () => {
        if (!isLoadingMore) return <View style={{ height: 20 }} />;
        return (
            <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingMoreText}>Loading more...</Text>
            </View>
        );
    };

    return (
        <TopSafeAreaView style={[globalStyles.container, { backgroundColor: COLORS.headerBackground }]}>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={<Text style={globalStyles.headerTitle}>Search Products</Text>}
            />

            {/* Search Bar */}
            <View style={styles.searchBarContainer}>
                <View style={styles.searchInputWrapper}>
                    <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        ref={searchInputRef}
                        style={styles.searchInput}
                        placeholder="Search by name, SKU, or description..."
                        placeholderTextColor={COLORS.placeholder}
                        value={searchText}
                        onChangeText={setSearchText}
                        returnKeyType="search"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchText("")} style={styles.clearIcon}>
                            <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity
                    style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
                    onPress={() => setShowFilters(true)}
                >
                    <Image
                        source={require("@/assets/images/filter.png")}
                        style={[globalStyles.headerImageSize, activeFilterCount > 0 && { tintColor: "#FFFFFF" }]}
                    />
                    {activeFilterCount > 0 && (
                        <View style={styles.filterBadge}>
                            <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Results count */}
            {hasSearched && !isLoading && (
                <View style={styles.resultsHeader}>
                    <Text style={styles.resultsCount}>
                        {total} {total === 1 ? "product" : "products"} found
                    </Text>
                    {activeFilterCount > 0 && (
                        <TouchableOpacity onPress={() => setFilters({})}>
                            <Text style={styles.clearFiltersText}>Clear filters</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Results */}
            {isLoading ? (
                <View style={globalStyles.centerElement}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={{ marginTop: 12, color: COLORS.textSecondary }}>Searching...</Text>
                </View>
            ) : (
                <FlatList
                    data={products}
                    keyExtractor={(item) => String(item.product_id)}
                    renderItem={renderProduct}
                    ListEmptyComponent={renderEmpty}
                    ListFooterComponent={renderFooter}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.3}
                    contentContainerStyle={styles.listContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Filter Panel */}
            <FilterPanel
                visible={showFilters}
                onClose={() => setShowFilters(false)}
                filters={filters}
                onApply={handleApplyFilters}
                categories={categories}
                brands={brands}
            />
        </TopSafeAreaView>
    );
}

// --- Main Styles ---
const styles = StyleSheet.create({
    searchBarContainer: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 10,
        backgroundColor: COLORS.headerBackground,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    searchInputWrapper: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.inputBg,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        paddingHorizontal: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: COLORS.textPrimary,
        height: 44,
    },
    clearIcon: {
        padding: 4,
    },
    filterButton: {
        width: 46,
        height: 46,
        borderRadius: 10,
        backgroundColor: COLORS.inputBg,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        justifyContent: "center",
        alignItems: "center",
    },
    filterButtonActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    filterBadge: {
        position: "absolute",
        top: -4,
        right: -4,
        backgroundColor: COLORS.primary,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: COLORS.headerBackground,
    },
    filterBadgeText: {
        color: "white",
        fontSize: 10,
        fontWeight: "700",
    },
    resultsHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: COLORS.background,
    },
    resultsCount: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: "600",
    },
    clearFiltersText: {
        fontSize: 13,
        color: COLORS.primary,
        fontWeight: "600",
    },
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 20,
        flexGrow: 1,
    },
    productCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    productCardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 10,
    },
    productName: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textPrimary,
        lineHeight: 22,
    },
    productBrand: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    productMeta: {
        flexDirection: "row",
        gap: 16,
        marginBottom: 8,
    },
    metaItem: {
        flexDirection: "column",
    },
    metaLabel: {
        fontSize: 11,
        fontWeight: "600",
        color: COLORS.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    metaValue: {
        fontSize: 14,
        color: COLORS.textPrimary,
        fontWeight: "500",
        marginTop: 2,
    },
    productDescription: {
        fontSize: 13,
        color: COLORS.textSecondary,
        lineHeight: 18,
        marginTop: 4,
    },
    cardArrow: {
        position: "absolute",
        right: 12,
        top: "50%",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 6,
        textAlign: "center",
    },
    loadingMore: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 16,
        gap: 8,
    },
    loadingMoreText: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
});

// --- Filter Styles ---
const filterStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    container: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "80%",
        paddingBottom: 30,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    body: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    pickerButton: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: COLORS.inputBg,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    pickerText: {
        fontSize: 15,
        color: COLORS.textPrimary,
    },
    pickerList: {
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        borderRadius: 10,
        marginTop: 6,
        maxHeight: 200,
        backgroundColor: COLORS.inputBg,
    },
    pickerItem: {
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    pickerItemSelected: {
        backgroundColor: "#FFF0F0",
    },
    pickerItemText: {
        fontSize: 14,
        color: COLORS.textPrimary,
    },
    pickerItemTextSelected: {
        color: COLORS.primary,
        fontWeight: "600",
    },
    brandSearchInput: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        color: COLORS.textPrimary,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    chipRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.inputBg,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
    },
    chipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    chipText: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    chipTextActive: {
        color: "white",
    },
    footer: {
        flexDirection: "row",
        paddingHorizontal: 20,
        paddingTop: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    clearButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: "center",
    },
    clearButtonText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    applyButton: {
        flex: 2,
        paddingVertical: 14,
        borderRadius: 10,
        backgroundColor: COLORS.primary,
        alignItems: "center",
    },
    applyButtonText: {
        fontSize: 15,
        fontWeight: "700",
        color: "white",
    },
});
