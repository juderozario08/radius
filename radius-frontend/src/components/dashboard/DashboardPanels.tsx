import { dashboardStyles as styles } from "@/components/dashboard/dashboardStyles";
import { COLORS } from "@/constants/colors";
import { StoreOperationSummary } from "@/types/admin.types";
import { Ionicons } from "@expo/vector-icons";
import { ComponentProps, ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";

type IconName = ComponentProps<typeof Ionicons>["name"];

interface DashboardSectionProps {
    icon: IconName;
    title: string;
    actionLabel: string;
    onAction: () => void;
    isEmpty: boolean;
    emptyIcon: IconName;
    emptyText: string;
    emptyAction?: { label: string; onPress: () => void };
    children?: ReactNode;
}

export function DashboardSection({ icon, title, actionLabel, onAction, isEmpty, emptyIcon, emptyText, emptyAction, children }: DashboardSectionProps) {
    return (
        <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                    <Ionicons name={icon} size={18} color={COLORS.textPrimary} />
                    <Text style={styles.sectionHeading} accessibilityRole="header">{title}</Text>
                </View>
                <TouchableOpacity style={styles.headerActionBtn} onPress={onAction} accessibilityRole="button" accessibilityLabel={actionLabel}>
                    <Text style={styles.headerActionText}>{actionLabel}</Text>
                </TouchableOpacity>
            </View>

            {isEmpty ? (
                <View style={styles.emptyCard}>
                    <Ionicons name={emptyIcon} size={32} color={COLORS.textSecondary} />
                    <Text style={styles.emptyCardText}>{emptyText}</Text>
                    {emptyAction && (
                        <TouchableOpacity style={styles.emptyCardAction} onPress={emptyAction.onPress} accessibilityRole="button">
                            <Text style={styles.emptyCardActionText}>{emptyAction.label}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                children
            )}
        </View>
    );
}

function NetworkStat({ icon, iconColor, iconBackground, value, label }: { icon: IconName; iconColor: string; iconBackground: string; value: string | number; label: string }) {
    return (
        <View style={styles.networkStatCard} accessible accessibilityLabel={`${label}: ${value}`}>
            <View style={[styles.networkStatIconCircle, { backgroundColor: iconBackground }]}>
                <Ionicons name={icon} size={15} color={iconColor} />
            </View>
            <Text style={styles.networkStatValue}>{value}</Text>
            <Text style={styles.networkStatLabel}>{label}</Text>
        </View>
    );
}

export function AdminNetworkStats({ stores }: { stores: StoreOperationSummary[] }) {
    const sum = (key: "active_orders_count" | "active_counts_count" | "pending_pos_count") => stores.reduce((total, s) => total + s[key], 0);
    return (
        <View style={styles.networkStatsRow}>
            <NetworkStat icon="business" iconColor={COLORS.primary} iconBackground={COLORS.inactiveBg} value={`${stores.filter((s) => s.has_active_operations).length}/${stores.length}`} label="Active" />
            <NetworkStat icon="cart" iconColor={COLORS.warning} iconBackground={COLORS.warningBg} value={sum("active_orders_count")} label="Orders" />
            <NetworkStat icon="clipboard" iconColor={COLORS.info} iconBackground={COLORS.infoBg} value={sum("active_counts_count")} label="Counts" />
            <NetworkStat icon="cube" iconColor={COLORS.success} iconBackground={COLORS.activeBg} value={sum("pending_pos_count")} label="POs" />
        </View>
    );
}

export function SelectedStoreBanner({ store, onBack }: { store: StoreOperationSummary; onBack: () => void }) {
    return (
        <View style={styles.storeSelectedBanner}>
            <View style={styles.storeSelectedInfo}>
                <View style={styles.storeSelectedTitleRow}>
                    <Ionicons name="storefront" size={16} color={COLORS.primary} />
                    <Text style={styles.storeSelectedName}>{store.name}</Text>
                    {store.is_head_office && (
                        <View style={styles.hqBadge}>
                            <Text style={styles.hqText}>HQ</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.storeSelectedSub}>
                    Store #{store.store_id} • {store.city}, {store.province}
                </Text>
            </View>
            <TouchableOpacity style={styles.allStoresButton} onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to all stores">
                <Ionicons name="arrow-back" size={14} color={COLORS.primary} />
                <Text style={styles.allStoresButtonText}>All Stores</Text>
            </TouchableOpacity>
        </View>
    );
}
