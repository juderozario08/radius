//radius-frontend/app/(app)/_layout.tsx
import { Stack } from 'expo-router';

export default function AppStackLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />

            <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
        </Stack>
    );
}
