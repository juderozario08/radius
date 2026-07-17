// radius-frontend/app/(app)/home/actions/admin/Sessions.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { apiFetch } from "@/api/client";
import Toast from "react-native-toast-message";
import { GetAllSessionsResponse, Session } from "@/types/admin.types";

const renderSessionCard = ({ item }: { item: Session }) => (
    <View style={styles.card}>
        <View style={styles.cardHeader}>
            <Text style={styles.name}>{item.first_name} {item.last_name}</Text>
            <View style={[
                styles.statusBadge,
                { backgroundColor: item.is_active ? '#E8F5E9' : '#FFEBEE' }
            ]}>
                <Text style={[
                    styles.statusText,
                    { color: item.is_active ? '#2E7D32' : '#C70202' }
                ]}>
                    {item.is_active ? 'Active' : 'Inactive'}
                </Text>
            </View>
        </View>

        <View style={styles.detailsContainer}>
            <Text style={styles.detailRow}>
                <Text style={styles.label}>Role: </Text>
                <Text style={styles.value}>{item.role[0] + item.role.substring(1).toLowerCase()}</Text>
            </Text>
            <Text style={styles.detailRow}>
                <Text style={styles.label}>Email: </Text>
                <Text style={styles.value}>{item.email}</Text>
            </Text>
            <Text style={styles.detailRow}>
                <Text style={styles.label}>IP Address: </Text>
                <Text style={styles.value}>{item.ip_address}</Text>
            </Text>
            <Text style={styles.detailRow}>
                <Text style={styles.label}>Store ID: </Text>
                <Text style={styles.value}>{item.store_id}</Text>
            </Text>
            <Text style={styles.detailRow}>
                <Text style={styles.label}>Session ID: </Text>
                <Text style={styles.value}>{item.session_id}</Text>
            </Text>
        </View>
    </View>
);

export default function Sessions() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const data = await apiFetch<GetAllSessionsResponse>("/api/admin/get_all_sessions")
            setSessions(data.sessions || []);
        } catch (err) {
            setError("Could not load sessions. Please try again.");
            Toast.show({
                type: "error",
                text1: String(err),
                visibilityTime: 1000,
                autoHide: true,
                position: "bottom",
            });
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <View style={styles.container}>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={
                    <View style={{ flexDirection: 'row' }}>
                        <Text style={styles.headerTitle}>Active Sessions</Text>
                    </View>
                }
            />

            <View style={styles.content}>
                {isLoading ? (
                    <ActivityIndicator size="large" color="#C70202" style={styles.centerElement} />
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    headerTitle: {
        fontWeight: 'bold',
        fontSize: 20,
    },
    content: {
        flex: 1,
    },
    centerElement: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        padding: 16,
        gap: 12,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },
    name: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333333',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    detailsContainer: {
        gap: 6,
    },
    detailRow: {
        fontSize: 14,
    },
    label: {
        color: '#757575',
        fontWeight: '500',
    },
    value: {
        color: '#333333',
        fontWeight: '400',
    },
    errorText: {
        color: '#C70202',
        textAlign: 'center',
        marginTop: 40,
        fontSize: 16,
    },
    emptyText: {
        color: '#757575',
        textAlign: 'center',
        marginTop: 40,
        fontSize: 16,
    }
});
