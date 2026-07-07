import { Redirect } from 'expo-router'
import { Tabs } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { Image, Text, TouchableOpacity } from 'react-native'
import { apiFetch } from '@/api/client'

export default function AppLayout() {
    const { isAuthenticated, logout } = useAuth()

    if (!isAuthenticated) return <Redirect href="/(auth)/login" />

    async function submitLogout() {
        try {
            const res = await apiFetch('/api/logout', {
                method: 'POST',
            })
            await logout();
        } catch (err) {
            console.log(err)
        }
    }

    return (
        <Tabs screenOptions={{
            headerShown: true, headerRight: () => (
                <TouchableOpacity onPress={logout}>
                    <Image source={require('@/assets/images/logout.png')} style={{
                        width: 30,
                        height: 30,
                        marginRight: 10,
                    }} />
                </TouchableOpacity>
            )
        }}>
            <Tabs.Screen name="dashboard" options={{ title: 'Home' }} />
            <Tabs.Screen name="inventory" options={{ title: 'Inventory' }} />
            <Tabs.Screen name="orders" options={{ title: 'Orders' }} />
            <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
            <Tabs.Screen name="store" options={{ title: 'Store' }} />
            <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        </Tabs>
    )
}
