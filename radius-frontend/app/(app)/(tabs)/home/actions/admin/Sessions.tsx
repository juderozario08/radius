// radius-frontend/app/(app)/home/actions/admin/Sessions.tsx
import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { ENDPOINTS } from "@/constants/routes";
import { globalStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { GetAllSessionsResponse, Session } from "@/types/admin.types";
import { callApi, capitalize, showToast } from "@/utils/helpers";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DetailRow } from "@/components/common/DetailRow";
import { ActionButtonRow } from "@/components/common/ActionButtonRow";
import React, { useEffect, useState, useCallback } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import Pagination from "@/components/common/Pagination";

const SessionDetailModal: React.FC<{ session: Session | null; visible: boolean; onClose: () => void; onTerminated: () => void }> = ({ session, visible, onClose, onTerminated }) => {
    const { logout } = useAuth();
    const [isTerminating, setIsTerminating] = useState(false);

    if (!session) return null;

    const confirmTerminate = async () => {
        setIsTerminating(true);
        const result = await callApi(ENDPOINTS.AUTHENTICATED.ADMIN.SESSIONS.terminate, { method: "POST", body: { session_id: session.session_id } }, logout);
        setIsTerminating(false);

        if (result !== null) {
            showToast("success", "Session terminated");
            onTerminated();
            onClose();
        }
    };

    const handleTerminatePress = () => {
        Alert.alert("Terminate Session", `Are you sure you want to terminate this session for ${session.first_name}?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Terminate", style: "destructive", onPress: confirmTerminate },
        ]);
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={globalStyles.modalOverlay}>
                <View style={globalStyles.modalContentWrapper}>
                    <View style={globalStyles.modalCardContainer}>
                        <View style={globalStyles.modalHeader}>
                            <View>
                                <Text style={globalStyles.modalName}>{session.first_name} {session.last_name}</Text>
                                <Text style={globalStyles.modalRole}>{capitalize(session.role)}</Text>
                            </View>
                            <StatusBadge isActive={session.is_active} />
                        </View>
                        <View style={globalStyles.divider} />
                        <View style={globalStyles.section}>
                            <Text style={globalStyles.sectionTitle}>Contact Information</Text>
                            <DetailRow label="Email:" value={session.email} />
                        </View>
                        <View style={globalStyles.divider} />
                        <View style={globalStyles.section}>
                            <Text style={globalStyles.sectionTitle}>Session Details</Text>
                            <DetailRow label="Session ID:" value={session.session_id} />
                            <DetailRow label="IP Address:" value={session.ip_address} />
                            <DetailRow label="Store ID:" value={session.store_id} />
                        </View>
                    </View>
                    <ActionButtonRow buttons={[
                        { key: "close", label: "Close", kind: "neutral", onPress: onClose, disabled: isTerminating },
                        { key: "terminate", label: "Terminate", kind: "danger", onPress: handleTerminatePress, loading: isTerminating },
                    ]} />
                </View>
            </View>
        </Modal>
    );
};

export default function Sessions() {
    const { logout } = useAuth();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [detailModalVisible, setDetailModalVisible] = useState(false);

    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalLength, setTotalLength] = useState(0);

    useEffect(() => { fetchSessions(pageNumber, pageSize); }, [pageNumber, pageSize]);

    const fetchSessions = async (page: number, limit: number) => {
        setIsLoading(true);
        setError(null);
        const data = await callApi<GetAllSessionsResponse>(`${ENDPOINTS.AUTHENTICATED.ADMIN.SESSIONS.getAll}?page_number=${page}&page_size=${limit}`, { method: "GET" }, logout);
        if (data) {
            setSessions(data.sessions || []);
            setTotalLength(data.total_length || 0);
            showToast("success", data.message);
        } else {
            setError("Could not load sessions. Please try again.");
        }
        setIsLoading(false);
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setPageNumber(1);
    };

    const renderSessionCard = useCallback(({ item }: { item: Session }) => (
        <TouchableOpacity style={globalStyles.card} activeOpacity={0.7} onPress={() => { setSelectedSession(item); setDetailModalVisible(true); }}>
            <View style={globalStyles.cardHeader}>
                <Text style={styles.name}>{item.first_name} {item.last_name}</Text>
                <StatusBadge isActive={item.is_active} />
            </View>
            <View style={styles.detailsContainer}>
                <DetailRow layout="inline" label="Role: " value={capitalize(item.role)} />
                <DetailRow layout="inline" label="Email: " value={item.email} />
                <DetailRow layout="inline" label="IP Address: " value={item.ip_address} />
                <DetailRow layout="inline" label="Store ID: " value={item.store_id} />
            </View>
        </TouchableOpacity>
    ), []);

    const totalPages = Math.max(1, Math.ceil(totalLength / pageSize));

    return (
        <TopSafeAreaView>
            <HeaderComponent headerLeft={<BackButton />} headerCenter={<Text style={globalStyles.headerTitle}>Active Sessions</Text>} />
            <View style={[globalStyles.container, styles.listWrapper]}>
                {isLoading && sessions.length === 0 ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={globalStyles.centerElement} />
                ) : error ? (
                    <Text style={globalStyles.errorText}>{error}</Text>
                ) : sessions.length === 0 ? (
                    <Text style={globalStyles.emptyText}>No sessions found.</Text>
                ) : (
                    <>
                        {sessions.length === 0 ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={globalStyles.emptyText}>No sessions found.</Text>
                            </View>
                        ) : (
                            <FlatList data={sessions} keyExtractor={(item) => item.session_id.toString()} renderItem={renderSessionCard} contentContainerStyle={globalStyles.listContainer} showsVerticalScrollIndicator={false} initialNumToRender={10} windowSize={5} maxToRenderPerBatch={10} />
                        )}
                        <Pagination
                            currentPage={pageNumber}
                            totalPages={totalPages}
                            onPageChange={setPageNumber}
                            isLoading={isLoading}
                            pageSize={pageSize}
                            pageSizeOptions={[10, 20, 50]}
                            onPageSizeChange={handlePageSizeChange}
                        />
                    </>
                )}
            </View>
            <SessionDetailModal session={selectedSession} visible={detailModalVisible} onClose={() => setDetailModalVisible(false)} onTerminated={() => fetchSessions(pageNumber, pageSize)} />
        </TopSafeAreaView>
    );
}

const styles = StyleSheet.create({
    listWrapper: {
        flex: 1,
        paddingBottom: 0,
    },
    name: { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary },
    detailsContainer: { gap: 6 },
});
