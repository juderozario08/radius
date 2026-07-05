import { Slot } from 'expo-router'
import { AuthProvider } from '@/context/AuthContext'
import { StoreProvider } from '@/context/StoreContext'

export default function RootLayout() {
    return (
        <AuthProvider>
            <StoreProvider>
                <Slot />
            </StoreProvider>
        </AuthProvider>
    )
}
