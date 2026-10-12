import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TopSafeAreaView } from '@/components/common/TopSafeAreaView';
import HeaderComponent from '@/components/common/HeaderComponent';
import BackButton from '@/components/common/BackButton';
import { getFillReport } from '@/api/reports.api';
import { FillReportResponse } from '@/types/report.types';
import { COLORS } from '@/constants/colors';
import { globalStyles, SPACING, RADIUS, FONT_SIZE } from '@/constants/styles';
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useAuth } from '@/hooks/useAuth';

export default function BackRoomFillReportsScreen() {
    const router = useRouter();
    const { logout } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [report, setReport] = useState<FillReportResponse | null>(null);

    const loadData = useCallback(async () => {
        const data = await getFillReport(logout);
        if (data) setReport(data);
        setLoading(false);
        setRefreshing(false);
    }, [logout]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    return (
        <TopSafeAreaView style={[globalStyles.container, { backgroundColor: COLORS.background }]}>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={<Text style={globalStyles.headerTitle}>Restock Overview</Text>}
                headerRight={
                    <TouchableOpacity onPress={onRefresh} style={{ marginRight: SPACING.mdlPlus }}>
                        <Ionicons name="refresh-outline" size={22} color={COLORS.primary} />
                    </TouchableOpacity>
                }
            />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.container}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[COLORS.primary]}
                        tintColor={COLORS.primary}
                    />
                }
            >
                <Text style={[globalStyles.sectionTitle, { marginBottom: SPACING.md }]}>
                    Back Room & Floor Restock Status
                </Text>

                {loading && !refreshing ? (
                    <View style={globalStyles.centerElement}>
                        <LoadingSpinner />
                    </View>
                ) : (
                    <>
                        <View style={styles.heroCard}>
                            <View style={styles.heroHeader}>
                                <MaterialCommunityIcons name="dolly" size={28} color={COLORS.surface} />
                                <View style={styles.heroTextContainer}>
                                    <Text style={styles.heroTitle}>Floor Fill Pipeline</Text>
                                    <Text style={styles.heroSubtitle}>
                                        Rolling demand from sales floor scans & POS checkouts
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.statsRow}>
                                <View style={styles.statBox}>
                                    <Text style={styles.statNumber}>{report?.total_items ?? 0}</Text>
                                    <Text style={styles.statLabel}>Products Needed</Text>
                                </View>

                                <View style={styles.statDivider} />

                                <View style={styles.statBox}>
                                    <Text style={[styles.statNumber, { color: COLORS.dangerBorderLight }]}>
                                        +{report?.fill_qty_sum ?? 0}
                                    </Text>
                                    <Text style={styles.statLabel}>Total Units</Text>
                                </View>

                                <View style={styles.statDivider} />

                                <View style={styles.statBox}>
                                    <Text style={[styles.statNumber, { color: COLORS.pendingBorder }]}>
                                        {report?.is4tc_count ?? 0}
                                    </Text>
                                    <Text style={styles.statLabel}>Empty Holes</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.actionsSection}>
                            <Text style={styles.subHeading}>Restock Actions</Text>

                            <TouchableOpacity
                                style={styles.actionCard}
                                activeOpacity={0.8}
                                onPress={() => router.push('/(app)/(tabs)/home/actions/sales_floor/FillReport')}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: COLORS.inactiveBg }]}>
                                    <Ionicons name="list" size={24} color={COLORS.primary} />
                                </View>
                                <View style={styles.actionContent}>
                                    <Text style={styles.actionTitle}>Open Active Fill Report</Text>
                                    <Text style={styles.actionDesc}>
                                        View aisle-optimized list of items needing shelf replenishment
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionCard}
                                activeOpacity={0.8}
                                onPress={() => router.push('/(app)/(tabs)/home/actions/sales_floor/IS4TC')}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: COLORS.infoBg }]}>
                                    <Ionicons name="scan" size={24} color={COLORS.accent} />
                                </View>
                                <View style={styles.actionContent}>
                                    <Text style={styles.actionTitle}>Scan Empty Holes (IS4TC)</Text>
                                    <Text style={styles.actionDesc}>
                                        Scan empty shelf locations to log them directly into the Fill Report
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionCard}
                                activeOpacity={0.8}
                                onPress={() => router.push('/(app)/(tabs)/inventory')}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: COLORS.activeBg }]}>
                                    <Ionicons name="cube-outline" size={24} color={COLORS.success} />
                                </View>
                                <View style={styles.actionContent}>
                                    <Text style={styles.actionTitle}>MIMS Bin & Location Transfer</Text>
                                    <Text style={styles.actionDesc}>
                                        Manage back room binning and physical inventory movements
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </ScrollView>
        </TopSafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: SPACING.lg,
        paddingBottom: SPACING.xxxl,
    },
    heroCard: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lgPlus,
        padding: SPACING.lgPlus,
        marginBottom: SPACING.xxl,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    heroHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        marginBottom: SPACING.lg,
    },
    heroTextContainer: {
        flex: 1,
    },
    heroTitle: {
        fontSize: FONT_SIZE.xl,
        fontWeight: 'bold',
        color: COLORS.surface,
    },
    heroSubtitle: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.whiteAlpha85,
        marginTop: SPACING.xxs,
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: COLORS.blackAlpha15,
        borderRadius: RADIUS.mdl,
        paddingVertical: SPACING.md,
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    statBox: {
        alignItems: 'center',
        flex: 1,
    },
    statDivider: {
        width: 1,
        height: '60%',
        backgroundColor: COLORS.whiteAlpha20,
    },
    statNumber: {
        fontSize: FONT_SIZE.xxl,
        fontWeight: '800',
        color: COLORS.surface,
        marginBottom: SPACING.xxs,
    },
    statLabel: {
        fontSize: FONT_SIZE.xxs,
        color: COLORS.whiteAlpha85,
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    actionsSection: {
        gap: SPACING.md,
    },
    subHeading: {
        fontSize: FONT_SIZE.lg,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        gap: SPACING.mdl,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    iconCircle: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionContent: {
        flex: 1,
    },
    actionTitle: {
        fontSize: FONT_SIZE.mdl,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: SPACING.xxs,
    },
    actionDesc: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        lineHeight: 16,
    },
});
