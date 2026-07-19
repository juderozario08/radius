// radius-frontend/app/(app)/home/actions/admin/Sessions.tsx
import { apiFetch, UnauthorizedError } from "@/api/client";
import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { COLORS } from "@/constants/colors";
import { ENDPOINTS } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { GetAllSessionsResponse, Session } from "@/types/admin.types";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";

function capitalize(value: string): string {
    if (!value) return value;
    return value.charAt(0) + value.slice(1).toLowerCase();
}

function showToast(type: "success" | "error", text: string) {
    Toast.show({ type, text1: text, position: "bottom", visibilityTime: 1000 });
}

async function callApi<T>(
    endpoint: string,
    options: { method: string; body?: any },
    logout: () => Promise<void>
): Promise<T | null> {
    try {
        return await apiFetch<T>(endpoint, {
            method: options.method,
            body: options.body ? JSON.stringify(options.body) : undefined,
        });
    } catch (err) {
        showToast("error", String(err));
        if (err instanceof UnauthorizedError) {
            await logout();
        }
        return null;
    }
}

const StatusBadge: React.FC<{ isActive: boolean }> = ({ isActive }) => (
    <View style={[styles.statusBadge, { backgroundColor: isActive ? COLORS.activeBg : COLORS.inactiveBg }]}>
        <Text style={[styles.statusText, { color: isActive ? COLORS.activeText : COLORS.inactiveText }]}>
            {isActive ? "Active" : "Inactive"}
        </Text>
    </View>
);

const DetailRow: React.FC<{ label: string; value: string | number; layout?: "inline" | "row" }> = ({
    label,
    value,
    layout = "row",
}) => {
    if (layout === "inline") {
        return (
            <Text style={styles.detailRow}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>{value}</Text>
            </Text>
        );
    }
    return (
        <View style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
        </View>
    );
};

type ButtonKind = "neutral" | "primary" | "danger";

const BUTTON_KIND_STYLES: Record<ButtonKind, { container: object; text: object }> = {
    neutral: { container: { backgroundColor: COLORS.neutralBg }, text: { color: COLORS.textPrimary } },
    primary: { container: { backgroundColor: COLORS.primary }, text: { color: COLORS.primaryText } },
    danger: { container: { backgroundColor: COLORS.danger }, text: { color: COLORS.dangerText } },
};

interface ActionButtonConfig {
    key: string;
    label: string;
    kind: ButtonKind;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
}

const ActionButtonRow: React.FC<{ buttons: ActionButtonConfig[] }> = ({ buttons }) => (
    <View style={styles.actionRow}>
        {buttons.map((button) => {
            const kindStyle = BUTTON_KIND_STYLES[button.kind];
            return (
                <TouchableOpacity
                    key={button.key}
                    style={[styles.actionButton, kindStyle.container]}
                    onPress={button.onPress}
                    disabled={button.disabled || button.loading}
                >
                    {button.loading ? (
                        <ActivityIndicator color={kindStyle.text.color as string} />
                    ) : (
                        <Text style={[styles.actionButtonText, kindStyle.text]}>{button.label}</Text>
                    )}
                </TouchableOpacity>
            );
        })}
    </View>
);

interface SessionDetailModalProps {
    session: Session | null;
    visible: boolean;
    onClose: () => void;
    onTerminated: () => void;
}

const SessionDetailModal: React.FC<SessionDetailModalProps> = ({ session, visible, onClose, onTerminated }) => {
    const { logout } = useAuth();
    const [isTerminating, setIsTerminating] = useState(false);

    if (!session) return null;

    const confirmTerminate = async () => {
        setIsTerminating(true);
        const result = await callApi(
            ENDPOINTS.ADMIN.SESSIONS.terminate, {
            method: "POST",
            body: { session_id: session.session_id }
        }, logout);
        setIsTerminating(false);

        if (result !== null) {
            showToast("success", "Session terminated");
            onTerminated();
            onClose();
        }
    };

    const handleTerminatePress = () => {
        Alert.alert(
            "Terminate Session",
            `Are you sure you want to terminate this session for ${session.first_name} ${session.last_name}? They will be signed out immediately.`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Terminate", style: "destructive", onPress: confirmTerminate },
            ]
        );
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContentWrapper}>
                    <View style={styles.modalCardContainer}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalName}>
                                    {session.first_name} {session.last_name}
                                </Text>
                                <Text style={styles.modalRole}>{capitalize(session.role)}</Text>
                            </View>
                            <StatusBadge isActive={session.is_active} />
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Contact Information</Text>
                            <DetailRow label="Email:" value={session.email} />
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Session Details</Text>
                            <DetailRow label="Session ID:" value={session.session_id} />
                            <DetailRow label="IP Address:" value={session.ip_address} />
                            <DetailRow label="Store ID:" value={session.store_id} />
                        </View>
                    </View>

                    <ActionButtonRow
                        buttons={[
                            { key: "close", label: "Close", kind: "neutral", onPress: onClose, disabled: isTerminating },
                            {
                                key: "terminate",
                                label: "Terminate",
                                kind: "danger",
                                onPress: handleTerminatePress,
                                loading: isTerminating,
                            },
                        ]}
                    />
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

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        setIsLoading(true);
        setError(null);

        const data = await callApi<GetAllSessionsResponse>(ENDPOINTS.ADMIN.SESSIONS.getAll, { method: "GET" }, logout);

        if (data) {
            setSessions(data.sessions || []);
        } else {
            setError("Could not load sessions. Please try again.");
        }
        setIsLoading(false);
    };

    const handleViewSession = (session: Session) => {
        setSelectedSession(session);
        setDetailModalVisible(true);
    };

    const handleCloseDetailModal = () => {
        setDetailModalVisible(false);
        setSelectedSession(null);
    };

    const renderSessionCard = ({ item }: { item: Session }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => handleViewSession(item)}>
            <View style={styles.cardHeader}>
                <Text style={styles.name}>
                    {item.first_name} {item.last_name}
                </Text>
                <StatusBadge isActive={item.is_active} />
            </View>

            <View style={styles.detailsContainer}>
                <DetailRow layout="inline" label="Role: " value={capitalize(item.role)} />
                <DetailRow layout="inline" label="Email: " value={item.email} />
                <DetailRow layout="inline" label="IP Address: " value={item.ip_address} />
                <DetailRow layout="inline" label="Store ID: " value={item.store_id} />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={<Text style={styles.headerTitle}>Active Sessions</Text>}
            />

            <View style={styles.content}>
                {isLoading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={styles.centerElement} />
                ) : error ? (
                    <Text style={styles.errorText}>{error}</Text>
                ) : sessions.length === 0 ? (
                    <Text style={styles.emptyText}>No sessions found.</Text>
                ) : (
                    <FlatList
                        data={sessions}
                        keyExtractor={(item) => item.session_id.toString()}
                        renderItem={renderSessionCard}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

            <SessionDetailModal
                session={selectedSession}
                visible={detailModalVisible}
                onClose={handleCloseDetailModal}
                onTerminated={fetchSessions}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    headerTitle: { fontWeight: "bold", fontSize: 20 },
    content: { flex: 1 },
    centerElement: { flex: 1, justifyContent: "center", alignItems: "center" },
    listContainer: { padding: 16, gap: 12 },

    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    name: { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 12, fontWeight: "600" },
    detailsContainer: { gap: 6 },
    detailRow: { fontSize: 14 },
    label: { color: COLORS.textSecondary, fontWeight: "500" },
    value: { color: COLORS.textPrimary, fontWeight: "400" },
    errorText: { color: COLORS.primary, textAlign: "center", marginTop: 40, fontSize: 16 },
    emptyText: { color: COLORS.textSecondary, textAlign: "center", marginTop: 40, fontSize: 16 },

    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContentWrapper: {
        width: "100%",
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        overflow: "hidden",
    },
    modalCardContainer: { padding: 20, width: "100%" },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
    modalName: { fontSize: 22, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 4 },
    modalRole: { fontSize: 16, fontWeight: "500", color: COLORS.textSecondary, textTransform: "capitalize" },
    divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
    section: { gap: 8 },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#9E9E9E",
        textTransform: "uppercase",
        marginBottom: 4,
    },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

    actionRow: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 10,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    actionButton: {
        flex: 0,
        minWidth: 92,
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    actionButtonText: { fontWeight: "600", fontSize: 14 },
});