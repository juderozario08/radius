import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/colors";
import { dashboardStyles as styles } from "@/components/dashboard/dashboardStyles";

export type DashboardTab = "overview" | "orders" | "cycle_counts" | "activities";
export type DashboardScope = "my_tasks" | "store_wide";

interface DashboardControlsProps {
    scope: DashboardScope;
    tab: DashboardTab;
    myOrderCount: number;
    storeOrderCount: number;
    orderCount: number;
    cycleCount: number;
    activityCount: number;
    onScopeChange: (scope: DashboardScope) => void;
    onTabChange: (tab: DashboardTab) => void;
    onOpenOrders: () => void;
    onOpenCycleCounts: () => void;
    onOpenActivities: () => void;
}

export function DashboardControls({ scope, tab, myOrderCount, storeOrderCount, orderCount, cycleCount, activityCount, onScopeChange, onTabChange, onOpenOrders, onOpenCycleCounts, onOpenActivities }: DashboardControlsProps) {
    const selectMetric = (target: DashboardTab, open: () => void) => {
        if (tab === target) open();
        else onTabChange(target);
    };

    return (
        <>
            <View style={styles.scopeSwitcherContainer}>
                <TouchableOpacity style={[styles.scopeButton, scope === "my_tasks" && styles.scopeButtonActive]} onPress={() => onScopeChange("my_tasks")}>
                    <Ionicons name="person" size={14} color={scope === "my_tasks" ? COLORS.primaryText : COLORS.textSecondary} />
                    <Text style={[styles.scopeText, scope === "my_tasks" && styles.scopeTextActive]}>My Tasks</Text>
                    {myOrderCount > 0 && <View style={styles.scopeCountBadge}><Text style={styles.scopeCountText}>{myOrderCount}</Text></View>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.scopeButton, scope === "store_wide" && styles.scopeButtonActive]} onPress={() => onScopeChange("store_wide")}>
                    <Ionicons name="business" size={14} color={scope === "store_wide" ? COLORS.primaryText : COLORS.textSecondary} />
                    <Text style={[styles.scopeText, scope === "store_wide" && styles.scopeTextActive]}>Store-Wide</Text>
                    <View style={[styles.scopeCountBadge, { backgroundColor: COLORS.inactiveBg }]}>
                        <Text style={[styles.scopeCountText, { color: COLORS.textPrimary }]}>{storeOrderCount}</Text>
                    </View>
                </TouchableOpacity>
            </View>
            <View style={styles.metricsRow}>
                <TouchableOpacity style={[styles.metricCard, tab === "orders" && styles.metricCardActive]} onPress={() => selectMetric("orders", onOpenOrders)}>
                    <View style={styles.metricIconRow}><Ionicons name="cart" size={20} color={COLORS.primary} /><Text style={styles.metricValue}>{orderCount}</Text></View>
                    <View style={styles.metricLabelRow}><Text style={styles.metricLabel}>{scope === "my_tasks" ? "My Orders" : "Live Orders"}</Text><Ionicons name="chevron-forward" size={12} color={COLORS.textSecondary} /></View>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.metricCard, tab === "cycle_counts" && styles.metricCardActive]} onPress={() => selectMetric("cycle_counts", onOpenCycleCounts)}>
                    <View style={styles.metricIconRow}><Ionicons name="barcode" size={20} color={COLORS.accent} /><Text style={styles.metricValue}>{cycleCount}</Text></View>
                    <View style={styles.metricLabelRow}><Text style={styles.metricLabel}>Cycle Counts</Text><Ionicons name="chevron-forward" size={12} color={COLORS.textSecondary} /></View>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.metricCard, tab === "activities" && styles.metricCardActive]} onPress={() => selectMetric("activities", onOpenActivities)}>
                    <View style={styles.metricIconRow}><Ionicons name="pulse" size={20} color={COLORS.success} /><Text style={styles.metricValue}>{activityCount}</Text></View>
                    <View style={styles.metricLabelRow}><Text style={styles.metricLabel}>Activities</Text><Ionicons name="chevron-forward" size={12} color={COLORS.textSecondary} /></View>
                </TouchableOpacity>
            </View>
            <View style={styles.tabsContainer}>
                <TouchableOpacity style={[styles.tabButton, tab === "overview" && styles.tabButtonActive]} onPress={() => onTabChange("overview")}>
                    <Text style={[styles.tabText, tab === "overview" && styles.tabTextActive]}>Overview</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabButton, tab === "orders" && styles.tabButtonActive]} onPress={() => onTabChange("orders")}>
                    <Text style={[styles.tabText, tab === "orders" && styles.tabTextActive]}>Live Orders ({orderCount})</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabButton, tab === "cycle_counts" && styles.tabButtonActive]} onPress={() => onTabChange("cycle_counts")}>
                    <Text style={[styles.tabText, tab === "cycle_counts" && styles.tabTextActive]}>Cycle Counts ({cycleCount})</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabButton, tab === "activities" && styles.tabButtonActive]} onPress={() => onTabChange("activities")}>
                    <Text style={[styles.tabText, tab === "activities" && styles.tabTextActive]}>Feed</Text>
                </TouchableOpacity>
            </View>
        </>
    );
}
