import { Redirect } from 'expo-router'
import { Tabs } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'

export default function AppLayout() {
    const { isAuthenticated } = useAuth()

    if (!isAuthenticated) return <Redirect href="/(auth)/login" />

    return (
        <Tabs screenOptions={{ headerShown: false }}>
            <Tabs.Screen name="dashboard" options={{ title: 'Home' }} />
            <Tabs.Screen name="inventory" options={{ title: 'Inventory' }} />
            <Tabs.Screen name="orders" options={{ title: 'Orders' }} />
            <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
            <Tabs.Screen name="store" options={{ title: 'Store' }} />
            <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        </Tabs>
    )
}
