// radius-frontend/app/(app)/home/actions/back_room/FillReports.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
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
import { globalStyles } from '@/constants/styles';

export default function BackRoomFillReportsScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [report, setReport] = useState<FillReportResponse | null>(null);

    const loadData = async () => {
        try {
            const data = await getFillReport();
            setReport(data);
        } catch (err) {
            console.error('Failed to load store fill status:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

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
                    <TouchableOpacity onPress={onRefresh} style={{ marginRight: 15 }}>
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
                <Text style={[globalStyles.sectionTitle, { marginBottom: 12 }]}>
                    Back Room & Floor Restock Status
                </Text>

                {loading && !refreshing ? (
                    <View style={globalStyles.centerElement}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                ) : (
                    <>
                        {/* Summary Status Banner */}
                        <View style={styles.heroCard}>
                            <View style={styles.heroHeader}>
                                <MaterialCommunityIcons name="dolly" size={28} color="#FFFFFF" />
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
                                    <Text style={[styles.statNumber, { color: '#FFCDD2' }]}>
                                        +{report?.fill_qty_sum ?? 0}
                                    </Text>
                                    <Text style={styles.statLabel}>Total Units</Text>
                                </View>

                                <View style={styles.statDivider} />

                                <View style={styles.statBox}>
                                    <Text style={[styles.statNumber, { color: '#FFE082' }]}>
                                        {report?.is4tc_count ?? 0}
                                    </Text>
                                    <Text style={styles.statLabel}>Empty Holes</Text>
                                </View>
                            </View>
                        </View>

                        {/* Action Navigation Cards */}
                        <View style={styles.actionsSection}>
                            <Text style={styles.subHeading}>Restock Actions</Text>

                            <TouchableOpacity
                                style={styles.actionCard}
                                activeOpacity={0.8}
                                onPress={() => router.push('/(app)/(tabs)/home/actions/sales_floor/FillReport')}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: '#FFEBEE' }]}>
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
                                <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
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
                                <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
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
        padding: 16,
        paddingBottom: 32,
    },
    heroCard: {
        backgroundColor: COLORS.primary,
        borderRadius: 14,
        padding: 18,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    heroHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    heroTextContainer: {
        flex: 1,
    },
    heroTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    heroSubtitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.85)',
        marginTop: 2,
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
        borderRadius: 10,
        paddingVertical: 12,
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
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    statNumber: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.85)',
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    actionsSection: {
        gap: 12,
    },
    subHeading: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        gap: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
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
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    actionDesc: {
        fontSize: 12,
        color: COLORS.textSecondary,
        lineHeight: 16,
    },
});
