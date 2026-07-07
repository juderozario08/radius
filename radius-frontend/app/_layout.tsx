import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider } from '@/context/AuthContext';
import { StoreProvider } from '@/context/StoreContext';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';

function InitialLayout() {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        if (!isAuthenticated) {
            router.replace('/(auth)/login');
        } else {
            router.replace('/(app)/dashboard');
        }
    }, [isAuthenticated, isLoading]);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return <Slot />;
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <StoreProvider>
                <InitialLayout />
            </StoreProvider>
        </AuthProvider>
    );
}
