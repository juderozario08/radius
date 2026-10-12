import { dashboardStyles as styles } from "@/components/dashboard/dashboardStyles";
import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";
import { CycleCountUpdatedPayload, StoreActivityPayload } from "@/types/websocket.types";
import { formatMoney } from "@/utils/money";
import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

export function DashboardCycleCountCard({ count, onPress }: { count: CycleCountUpdatedPayload; onPress: () => void }) {
    const progress = count.total_items > 0 ? count.counted_items / count.total_items : 0;
    return (
        <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[globalStyles.card, styles.cycleCountCard]}>
            <View style={styles.cycleCardHeader}>
                <View style={styles.cycleInfoColumn}>
                    <Text style={styles.cycleCategory}>{count.category_name}</Text>
                    <Text style={styles.cycleSubtext}>Count #{count.count_id} • Action: {count.action}</Text>
                </View>
                <View style={styles.cycleBadgeRow}>
                    <View style={styles.cycleBadge}><Text style={styles.cycleBadgeText}>{count.status}</Text></View>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                </View>
            </View>

            <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: `${Math.min(100, Math.round(progress * 100))}%` }]} />
            </View>

            <View style={styles.cycleStatsRow}>
                <Text style={styles.cycleStatLabel}>
                    Counted: <Text style={styles.cycleStatBold}>{count.counted_items} / {count.total_items}</Text> ({Math.round(progress * 100)}%)
                </Text>
                <Text style={[styles.cycleStatLabel, count.total_variance_cost < 0 ? styles.varianceNeg : styles.variancePos]}>
                    Variance: {formatMoney(count.total_variance_cost)}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

export function DashboardActivityCard({ activity, onPress }: { activity: StoreActivityPayload; onPress: () => void }) {
    const icon = activity.activity_type.includes("TIMEOUT") || activity.activity_type.includes("CANCEL")
        ? "time-outline"
        : activity.activity_type.includes("ORDER")
            ? "cart"
            : activity.activity_type.includes("CYCLE")
                ? "barcode"
                : activity.activity_type.includes("RECEIVING") || activity.activity_type.includes("PO")
                    ? "cube"
                    : "notifications-outline";
    return (
        <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[globalStyles.card, styles.activityCard]}>
            <View style={styles.activityIconCircle}>
                <Ionicons name={icon} size={16} color={COLORS.primary} />
            </View>
            <View style={styles.activityContent}>
                <View style={styles.activityHeaderRow}>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <View style={styles.activityTimeGroup}>
                        <Text style={styles.activityTime}>
                            {new Date(activity.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color={COLORS.textSecondary} />
                    </View>
                </View>
                <Text style={styles.activityDescription}>{activity.description}</Text>
            </View>
        </TouchableOpacity>
    );
}
