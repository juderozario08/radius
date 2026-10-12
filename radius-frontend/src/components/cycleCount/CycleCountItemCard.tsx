import { cycleCountDetailStyles as styles } from "@/components/cycleCount/cycleCountDetailStyles";
import { COLORS } from "@/constants/colors";
import { CycleCountItemDetail } from "@/types/cyclecount.types";
import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

type Props = {
    item: CycleCountItemDetail;
    canEdit: boolean;
    onEdit: (item: CycleCountItemDetail) => void;
};

export function CycleCountItemCard({ item, canEdit, onEdit }: Props) {
    const isMatched = item.counted_qty === item.expected_qty && item.counted_qty > 0;
    const isDiscrepancy = item.counted_qty > 0 && item.variance !== 0;

    let badgeBorder = COLORS.inputBorder;
    let badgeBg = COLORS.background;
    let badgeText = COLORS.textSecondary;

    if (isMatched) {
        badgeBorder = COLORS.successBorder;
        badgeBg = COLORS.activeBg;
        badgeText = COLORS.success;
    } else if (isDiscrepancy) {
        badgeBorder = item.variance < 0 ? COLORS.dangerBorder : COLORS.tealBorder;
        badgeBg = item.variance < 0 ? COLORS.inactiveBg : COLORS.tealBg;
        badgeText = item.variance < 0 ? COLORS.error : COLORS.tealDark;
    }

    return (
        <TouchableOpacity style={styles.itemRow} activeOpacity={canEdit ? 0.7 : 1} onPress={() => canEdit && onEdit(item)}>
            <View style={styles.productIconWrapper}>
                <Ionicons name="cube-outline" size={22} color={COLORS.textSecondary} />
            </View>

            <View style={styles.itemDetails}>
                <Text style={styles.itemTitle} numberOfLines={2}>{item.product_name}</Text>
                <Text style={styles.itemSub}>SKU: {item.sku}  UPC: {item.upc}</Text>
                {item.reason_code && <Text style={styles.reasonText}>Reason: {item.reason_code}</Text>}
            </View>

            <View style={styles.metricsCol}>
                <View style={styles.metricPairRow}>
                    <View style={styles.metricBox}>
                        <Text style={styles.metricLabel}>Expected</Text>
                        <Text style={styles.metricValExpected}>{item.expected_qty}</Text>
                    </View>
                    <View style={styles.metricDivider} />
                    <View style={styles.metricBox}>
                        <Text style={styles.metricLabel}>Scanned</Text>
                        <Text style={[styles.metricValScanned, { color: badgeText }]}>{item.counted_qty}</Text>
                    </View>
                </View>

                {item.counted_qty > 0 ? (
                    <View style={[styles.diffPill, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
                        <Text style={[styles.diffPillText, { color: badgeText }]}>
                            {isMatched ? "Matched" : item.variance > 0 ? `+${item.variance} over` : `${item.variance} short`}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.uncountedPill}>
                        <Text style={styles.uncountedPillText}>Not Counted</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}
