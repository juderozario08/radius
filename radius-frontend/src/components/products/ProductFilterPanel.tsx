import React, { useEffect, useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/colors";
import { SPACING } from "@/constants/styles";
import { Category, SearchFilters } from "@/types/inventory.types";
import { filterStyles } from "./productSearchStyles";
import { BrandPickerModal } from "./BrandPickerModal";

export function ProductFilterPanel({
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

    useEffect(() => {
        if (visible) setLocalFilters(filters);
    }, [visible, filters]);

    const selectedCategory = categories.find(c => c.category_id === localFilters.category_id);

    const activeFilterCount = [
        localFilters.category_id,
        localFilters.brand,
        localFilters.is_active !== undefined ? true : undefined,
        localFilters.unit_of_measure,
    ].filter(Boolean).length;

    return (
        <>
        <Modal visible={visible} animationType="slide" transparent>
            <View style={filterStyles.overlay}>
                <View style={filterStyles.container}>
                    <View style={filterStyles.header}>
                        <Text style={filterStyles.title}>Filters</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={filterStyles.body} showsVerticalScrollIndicator={false}>
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

                        <Text style={[filterStyles.label, { marginTop: SPACING.xl }]}>Brand</Text>
                        <TouchableOpacity
                            style={filterStyles.pickerButton}
                            onPress={() => setShowBrandPicker(true)}
                        >
                            <Text style={[
                                filterStyles.pickerText,
                                !localFilters.brand && { color: COLORS.placeholder },
                            ]}>
                                {localFilters.brand || "All Brands"}
                            </Text>
                            <Ionicons
                                name="chevron-forward"
                                size={18}
                                color={COLORS.textSecondary}
                            />
                        </TouchableOpacity>

                        <Text style={[filterStyles.label, { marginTop: SPACING.xl }]}>Status</Text>
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

                        <Text style={[filterStyles.label, { marginTop: SPACING.xl }]}>Unit of Measure</Text>
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
        <BrandPickerModal
            visible={visible && showBrandPicker}
            brands={brands}
            selectedBrand={localFilters.brand}
            onSelect={(brand) => setLocalFilters((current) => ({ ...current, brand }))}
            onClose={() => setShowBrandPicker(false)}
        />
        </>
    );
}
