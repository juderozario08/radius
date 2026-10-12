import { COLORS } from "@/constants/colors";
import { FONT_SIZE, globalStyles, RADIUS, SPACING } from "@/constants/styles";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { filterStyles } from "./productSearchStyles";

type Props = {
    visible: boolean;
    brands: string[];
    selectedBrand?: string;
    onSelect: (brand?: string) => void;
    onClose: () => void;
};

export function BrandPickerModal({ visible, brands, selectedBrand, onSelect, onClose }: Props) {
    const [search, setSearch] = useState("");
    const filteredBrands = useMemo(
        () => brands.filter((brand) => brand.toLowerCase().includes(search.trim().toLowerCase())),
        [brands, search]
    );

    const select = (brand?: string) => {
        onSelect(brand);
        setSearch("");
        onClose();
    };

    const close = () => {
        setSearch("");
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
            <View style={globalStyles.modalOverlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Brands</Text>
                        <TouchableOpacity onPress={close} accessibilityRole="button" accessibilityLabel="Close brand picker">
                            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={filterStyles.brandSearchInput}
                        placeholder="Search brands..."
                        placeholderTextColor={COLORS.placeholder}
                        value={search}
                        onChangeText={setSearch}
                        accessibilityLabel="Search brands"
                    />
                    <FlatList
                        data={filteredBrands}
                        keyExtractor={(brand) => brand}
                        keyboardShouldPersistTaps="handled"
                        initialNumToRender={20}
                        windowSize={7}
                        ListHeaderComponent={
                            <TouchableOpacity
                                style={[filterStyles.pickerItem, !selectedBrand && filterStyles.pickerItemSelected]}
                                onPress={() => select(undefined)}
                            >
                                <Text style={[filterStyles.pickerItemText, !selectedBrand && filterStyles.pickerItemTextSelected]}>All Brands</Text>
                            </TouchableOpacity>
                        }
                        renderItem={({ item: brand }) => (
                            <TouchableOpacity
                                style={[filterStyles.pickerItem, selectedBrand === brand && filterStyles.pickerItemSelected]}
                                onPress={() => select(brand)}
                            >
                                <Text style={[filterStyles.pickerItemText, selectedBrand === brand && filterStyles.pickerItemTextSelected]}>{brand}</Text>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={<Text style={styles.empty}>No brands found</Text>}
                    />
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        maxWidth: 440,
        maxHeight: "80%",
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING.xl,
    },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.md },
    title: { fontSize: FONT_SIZE.xl, fontWeight: "700", color: COLORS.textPrimary },
    empty: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, textAlign: "center", padding: SPACING.xl },
});
