import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Modal, Image, LayoutAnimation, Platform, UIManager } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { TopSafeAreaView } from '@/components/common/TopSafeAreaView';
import HeaderComponent from '@/components/common/HeaderComponent';
import BackButton from '@/components/common/BackButton';
import { ENDPOINTS } from '@/constants/routes';
import { AuditTrailResponse, AuditTrailEntry } from '@/types/inventory.types';
import { useAuth } from '@/hooks/useAuth';
import { globalStyles } from '@/constants/styles';
import { COLORS } from '@/constants/colors';
import { router } from 'expo-router';
import Gate from '@/components/common/Gate';

export default function Audit() {
    const { token, user } = useAuth();
    const [barcode, setBarcode] = useState('');
    const [data, setData] = useState<AuditTrailResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const LIMIT = 50;

    const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');
    const [filterTxnType, setFilterTxnType] = useState<string>('');
    const [filterStoreId, setFilterStoreId] = useState<string>('');
    const [showSortModal, setShowSortModal] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);

    const TRANSACTION_TYPES = [
        { label: "All Transactions", value: "" },
        { label: "Receipt", value: "RECEIPT" },
        { label: "Sale", value: "SALE" },
        { label: "Return", value: "RETURN" },
        { label: "Adjustment", value: "ADJUSTMENT" },
        { label: "Transfer", value: "TRANSFER" },
        { label: "Demo Assignment", value: "DEMO_ASSIGNMENT" },
        { label: "Cycle Count", value: "CYCLE_COUNT" }
    ];

    const fetchAuditTrail = async (reset: boolean = false) => {
        if (!barcode.trim()) return;

        setLoading(true);
        setError(null);
        const currentOffset = reset ? 0 : offset;

        try {
            const baseUrl = `${process.env.EXPO_PUBLIC_API_URL}${ENDPOINTS.AUTHENTICATED.MIMS.audit}?barcode=${barcode.trim()}&limit=${LIMIT}&offset=${currentOffset}&sort_order=${sortOrder}`;
            let url = filterTxnType ? `${baseUrl}&transaction_type=${filterTxnType}` : baseUrl;
            if (user?.role === 'ADMIN' && filterStoreId.trim()) {
                url += `&store_id=${filterStoreId.trim()}`;
            }
            
            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const result = await res.json();
            if (res.ok) {
                if (reset) {
                    setData(result);
                } else if (data) {
                    setData({
                        ...result,
                        events: [...data.events, ...result.events]
                    });
                }
                setHasMore(result.events.length === LIMIT);
                setOffset(currentOffset + LIMIT);
            } else {
                setError(result.error || 'Failed to fetch audit trail');
                setData(null);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        fetchAuditTrail(true);
    };

    useEffect(() => {
        // Trigger fetch only if we already have data (i.e., user changed sort/filter after initial search)
        if (data && barcode.trim()) {
            fetchAuditTrail(true);
        }
    }, [sortOrder, filterTxnType]);

    const loadMore = () => {
        if (!loading && hasMore && data) {
            fetchAuditTrail();
        }
    };

    // Helper function to format and extract routing info from reference_id
    const parseReference = (refId: string | null) => {
        if (!refId) return null;
        
        const parts = refId.split(':');
        if (parts.length === 2) {
            const prefix = parts[0];
            const id = parts[1];
            
            // Format nice label
            let label = `${prefix.charAt(0) + prefix.slice(1).toLowerCase()} #${id}`;
            if (prefix === 'PO') label = `Purchase Order #${id}`;
            if (prefix === 'ADJUSTMENT') label = `Adjustment #${id}`;
            if (prefix === 'TRANSFER') label = `Transfer #${id}`;

            return { prefix, id, label, raw: refId };
        }
        return { prefix: 'UNKNOWN', id: '', label: refId, raw: refId };
    };

    // Individual Event Component with Animation
    const EventCard = ({ item }: { item: AuditTrailEntry }) => {
        const [expanded, setExpanded] = useState(false);
        const isPositive = item.quantity > 0;
        const color = isPositive ? COLORS.success : (item.quantity < 0 ? COLORS.error : COLORS.textSecondary);
        const refInfo = parseReference(item.reference_id);

        const toggleExpand = () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setExpanded(!expanded);
        };

        const renderActionButton = () => {
            if (!refInfo) return null;

            switch (refInfo.prefix) {
                case 'PO':
                    return (
                        <Gate permission="view_back_room">
                            <TouchableOpacity 
                                style={[globalStyles.buttonSecondary, { marginTop: 10, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start' }]}
                                onPress={() => router.push({ pathname: '/(app)/(tabs)/home/actions/back_room/ReceivePO', params: { po_id: refInfo.id } })}
                            >
                                <Text style={globalStyles.buttonTextSecondary}>View Purchase Order</Text>
                            </TouchableOpacity>
                        </Gate>
                    );
                case 'TRANSFER':
                    return (
                        <Gate permission="view_back_room">
                            <TouchableOpacity 
                                style={[globalStyles.buttonSecondary, { marginTop: 10, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start' }]}
                                onPress={() => router.push({ pathname: '/(app)/(tabs)/home/actions/back_room/ReceiveTransfer', params: { transfer_id: refInfo.id } })}
                            >
                                <Text style={globalStyles.buttonTextSecondary}>View Transfer</Text>
                            </TouchableOpacity>
                        </Gate>
                    );
                case 'SALE':
                case 'TRANSACTION':
                    // We don't have a specific permission for Transactions, just let anyone view their own, 
                    // or maybe it's protected inside the route.
                    return (
                        <TouchableOpacity 
                            style={[globalStyles.buttonSecondary, { marginTop: 10, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start' }]}
                            onPress={() => router.push(`/(app)/(tabs)/home/actions/sales_floor/Transactions/${refInfo.id}`)}
                        >
                            <Text style={globalStyles.buttonTextSecondary}>View Transaction</Text>
                        </TouchableOpacity>
                    );
                default:
                    return null;
            }
        };

        return (
            <TouchableOpacity 
                style={[globalStyles.card, { marginBottom: 10 }]} 
                onPress={toggleExpand}
                activeOpacity={0.8}
            >
                {/* Always visible overview (3 columns) */}
                <View style={globalStyles.row}>
                    <Text style={[globalStyles.sectionTitle, { flex: 2, marginBottom: 0 }]}>{item.transaction_type}</Text>
                    <Text style={{ fontSize: 12, flex: 2, textAlign: 'center', color: COLORS.textSecondary }}>
                        {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                    <Text style={[{ fontWeight: 'bold', flex: 1, textAlign: 'right' }, { color }]}>
                        {isPositive ? '+' : ''}{item.quantity}
                    </Text>
                </View>

                {/* Expanded Details */}
                {expanded && (
                    <View style={{ marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border }}>
                        <Text style={{ fontSize: 12 }}>Time: {new Date(item.created_at).toLocaleTimeString()}</Text>
                        {item.employee_name && <Text style={{ fontSize: 12, marginTop: 4 }}>Employee: {item.employee_name}</Text>}
                        {refInfo && <Text style={{ fontSize: 12, marginTop: 4 }}>Reference: {refInfo.label}</Text>}
                        {item.reason_code && <Text style={{ fontSize: 12, marginTop: 4 }}>Reason: {item.reason_code}</Text>}
                        {item.from_store_name && <Text style={{ fontSize: 12, marginTop: 4 }}>From: {item.from_store_name}</Text>}
                        {item.to_store_name && <Text style={{ fontSize: 12, marginTop: 4 }}>To: {item.to_store_name}</Text>}
                        
                        {renderActionButton()}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={(
                    <View style={{ flexDirection: 'row' }}>
                        <Text style={globalStyles.headerTitle}>Audit Trail</Text>
                    </View>
                )}
            />

            <View style={[globalStyles.container, { padding: 15 }]}>
                <View style={{ marginBottom: 20 }}>
                    <Text style={globalStyles.modalInputLabel}>Search Product (SKU / UPC)</Text>
                    <View style={[globalStyles.row, { gap: 10 }]}>
                        <TextInput
                            style={[globalStyles.textInput, { flex: 1, marginBottom: 0 }]}
                            value={barcode}
                            onChangeText={setBarcode}
                            onSubmitEditing={handleSearch}
                            placeholder="Scan or type barcode..."
                            autoCapitalize="none"
                        />
                        <TouchableOpacity style={globalStyles.buttonPrimary} onPress={handleSearch}>
                            <Text style={globalStyles.buttonTextPrimary}>Search</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Filter and Sort Dropdowns */}
                {data && (
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 15, gap: 10 }}>
                        <TouchableOpacity 
                            style={[globalStyles.buttonSecondary, { paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }]}
                            onPress={() => setShowFilterModal(true)}
                        >
                            <Image 
                                source={require('@/assets/images/filter.png')} 
                                style={{ width: 14, height: 14, tintColor: filterTxnType ? COLORS.primary : COLORS.textPrimary }} 
                            />
                            <Text style={[globalStyles.buttonTextSecondary, { fontSize: 12 }]}>
                                {filterTxnType ? TRANSACTION_TYPES.find(t => t.value === filterTxnType)?.label : 'Filter'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[globalStyles.buttonSecondary, { paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }]}
                            onPress={() => setShowSortModal(true)}
                        >
                            <Image 
                                source={require('@/assets/images/sort.png')} 
                                style={{ width: 14, height: 14, tintColor: COLORS.textPrimary }} 
                            />
                            <Text style={[globalStyles.buttonTextSecondary, { fontSize: 12 }]}>
                                {sortOrder === 'DESC' ? 'Newest' : 'Oldest'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {error && <Text style={globalStyles.errorText}>{error}</Text>}

                {data && (
                    <View style={{ flex: 1 }}>
                        <View style={[globalStyles.card, { marginBottom: 20 }]}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{data.product.name}</Text>
                            <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>SKU: {data.product.sku} | UPC: {data.product.upc}</Text>
                        </View>

                        <Text style={[globalStyles.sectionTitle, { marginBottom: 10 }]}>Event Timeline</Text>
                        <FlatList
                            data={data.events}
                            keyExtractor={(item) => item.transaction_id.toString()}
                            renderItem={({ item }) => <EventCard item={item} />}
                            onEndReached={loadMore}
                            onEndReachedThreshold={0.5}
                            ListEmptyComponent={() => (
                                <Text style={[{ fontSize: 12, color: COLORS.textSecondary }, { textAlign: 'center', marginTop: 20 }]}>
                                    No audit history found for this product.
                                </Text>
                            )}
                            ListFooterComponent={() => loading ? <ActivityIndicator style={{ margin: 20 }} color={COLORS.primary} /> : null}
                        />
                    </View>
                )}
            </View>

            {/* Sort Modal */}
            <Modal visible={showSortModal} transparent={true} animationType="fade">
                <View style={globalStyles.modalOverlay}>
                    <View style={globalStyles.modalContentWrapper}>
                        <View style={globalStyles.modalCardContainer}>
                            <Text style={globalStyles.modalTitle}>Sort By Date</Text>
                            <View style={globalStyles.divider} />
                            
                            <TouchableOpacity 
                                style={{ paddingVertical: 12 }} 
                                onPress={() => { setSortOrder('DESC'); setShowSortModal(false); }}
                            >
                                <Text style={{ fontSize: 16, color: sortOrder === 'DESC' ? COLORS.primary : COLORS.textPrimary, fontWeight: sortOrder === 'DESC' ? 'bold' : 'normal' }}>
                                    Newest First
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={{ paddingVertical: 12 }} 
                                onPress={() => { setSortOrder('ASC'); setShowSortModal(false); }}
                            >
                                <Text style={{ fontSize: 16, color: sortOrder === 'ASC' ? COLORS.primary : COLORS.textPrimary, fontWeight: sortOrder === 'ASC' ? 'bold' : 'normal' }}>
                                    Oldest First
                                </Text>
                            </TouchableOpacity>

                            <View style={[globalStyles.divider, { marginTop: 10 }]} />
                            <TouchableOpacity style={[globalStyles.buttonSecondary, { marginTop: 10 }]} onPress={() => setShowSortModal(false)}>
                                <Text style={globalStyles.buttonTextSecondary}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Filter Modal */}
            <Modal visible={showFilterModal} transparent={true} animationType="fade">
                <View style={globalStyles.modalOverlay}>
                    <View style={globalStyles.modalContentWrapper}>
                        <View style={globalStyles.modalCardContainer}>
                            <Text style={globalStyles.modalTitle}>Filter by Type</Text>
                            <View style={globalStyles.divider} />
                            
                            {user?.role === 'ADMIN' && (
                                <View style={{ marginBottom: 15 }}>
                                    <Text style={[globalStyles.modalInputLabel, { marginBottom: 4 }]}>Store ID (Admin Only)</Text>
                                    <TextInput 
                                        style={[globalStyles.textInput, { paddingVertical: 8, paddingHorizontal: 10 }]}
                                        placeholder="Leave empty for all stores"
                                        value={filterStoreId}
                                        onChangeText={setFilterStoreId}
                                        keyboardType="number-pad"
                                    />
                                </View>
                            )}

                            {TRANSACTION_TYPES.map((type) => (
                                <TouchableOpacity 
                                    key={type.value}
                                    style={{ paddingVertical: 10 }} 
                                    onPress={() => { setFilterTxnType(type.value); setShowFilterModal(false); }}
                                >
                                    <Text style={{ 
                                        fontSize: 16, 
                                        color: filterTxnType === type.value ? COLORS.primary : COLORS.textPrimary, 
                                        fontWeight: filterTxnType === type.value ? 'bold' : 'normal' 
                                    }}>
                                        {type.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}

                            <View style={[globalStyles.divider, { marginTop: 10 }]} />
                            <TouchableOpacity style={[globalStyles.buttonSecondary, { marginTop: 10 }]} onPress={() => setShowFilterModal(false)}>
                                <Text style={globalStyles.buttonTextSecondary}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </TopSafeAreaView>
    );
}
