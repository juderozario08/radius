import { StatusBadge } from "@/components/common/StatusBadge";
import { COLORS } from "@/constants/colors";
import { globalStyles, SPACING } from "@/constants/styles";
import { Product } from "@/types/inventory.types";
import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { productSearchStyles as styles } from "./productSearchStyles";

export function ProductSearchCard({ product, onPress }: { product: Product; onPress: () => void }) {
    return (
        <TouchableOpacity style={[globalStyles.card, { marginBottom: SPACING.smd, borderWidth: 1, borderColor: COLORS.border, shadowOpacity: 0.05, elevation: 1 }]} onPress={onPress} activeOpacity={0.7}>
            <View style={globalStyles.cardHeader}>
                <View style={{ flex: 1, marginRight: SPACING.sm }}>
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

