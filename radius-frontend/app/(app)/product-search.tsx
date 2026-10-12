import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Image,
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import HeaderComponent from "@/components/common/HeaderComponent";
import BackButton from "@/components/common/BackButton";
import { COLORS } from "@/constants/colors";
import { globalStyles, SPACING } from "@/constants/styles";
import { productSearchStyles as styles } from "@/components/products/productSearchStyles";
import { ProductFilterPanel } from "@/components/products/ProductFilterPanel";
import { ProductSearchCard } from "@/components/products/ProductSearchCard";
import { getProductBrands, getProductCategories, searchCatalogProducts } from "@/api/products.api";
import { useAuth } from "@/hooks/useAuth";
import { router } from "expo-router";
import { Product, Category, SearchFilters } from "@/types/inventory.types";
import { Ionicons } from "@expo/vector-icons";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

const PAGE_SIZE = 25;

export default function ProductSearchScreen() {
    const { logout } = useAuth();
    const [searchText, setSearchText] = useState("");
    const [products, setProducts] = useState<Product[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasSearched, setHasSearched] = useState(false);

    const [filters, setFilters] = useState<SearchFilters>({});
    const [showFilters, setShowFilters] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [brands, setBrands] = useState<string[]>([]);

    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const searchInputRef = useRef<TextInput>(null);
    const searchSeqRef = useRef<number>(0);

    const loadFilterOptions = useCallback(async () => {
        const [cats, brnds] = await Promise.all([
            getProductCategories(logout),
            getProductBrands(logout),
        ]);
        if (cats) setCategories(cats);
        if (brnds) setBrands(brnds);
    }, [logout]);

    useEffect(() => {
        void loadFilterOptions();
        setTimeout(() => searchInputRef.current?.focus(), 300);
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, [loadFilterOptions]);

    const searchProducts = useCallback(async (query: string, activeFilters: SearchFilters, pageOffset: number = 0, signal?: AbortSignal) => {
        if (pageOffset === 0) {
            setIsLoading(true);
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            abortControllerRef.current = new AbortController();
        } else {
            setIsLoadingMore(true);
        }

        const controller = abortControllerRef.current;
        const currentSeq = ++searchSeqRef.current;

        const data = await searchCatalogProducts(query, activeFilters, PAGE_SIZE, pageOffset, controller?.signal, logout);

        if (controller?.signal.aborted || currentSeq !== searchSeqRef.current) {
            return;
        }

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

    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        debounceTimer.current = setTimeout(() => {
            searchProducts(searchText, filters, 0, controller.signal);
        }, 300);

        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            controller.abort();
        };
    }, [searchText, filters, searchProducts]);

    const handleLoadMore = () => {
        if (!isLoadingMore && !isLoading && products.length < total) {
            const controller = new AbortController();
            abortControllerRef.current = controller;
            searchProducts(searchText, filters, offset, controller.signal);
        }
    };

    const handleApplyFilters = (newFilters: SearchFilters) => {
        setFilters(newFilters);
    };

    const activeFilterCount = [
        filters.category_id,
        filters.brand,
        filters.is_active !== undefined ? true : undefined,
        filters.unit_of_measure,
    ].filter(Boolean).length;

    const renderProduct = ({ item }: { item: Product }) => (
        <ProductSearchCard
            product={item}
            onPress={() => router.push(`/(app)/product/${item.product_id}`)}
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
                        style={[globalStyles.headerImageSize, activeFilterCount > 0 && { tintColor: COLORS.surface }]}
                    />
                    {activeFilterCount > 0 && (
                        <View style={styles.filterBadge}>
                            <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

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

            {isLoading ? (
                <View style={globalStyles.centerElement}>
                    <LoadingSpinner />
                    <Text style={{ marginTop: SPACING.md, color: COLORS.textSecondary }}>Searching...</Text>
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

            <ProductFilterPanel
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
