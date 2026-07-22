//radius-frontend/app/index.tsx
import { Redirect } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { useAuth } from '@/hooks/useAuth'

export default function Index() {
    const { isAuthenticated, isLoading } = useAuth()

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator />
            </View>
        )
    }

    return isAuthenticated
        ? <Redirect href="/(app)/(tabs)/home/dashboard" />
        : <Redirect href="/(auth)/login" />
}
