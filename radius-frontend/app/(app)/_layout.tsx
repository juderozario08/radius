import { Stack } from 'expo-router';

export { RouteErrorBoundary as ErrorBoundary } from "@/components/common/RouteErrorBoundary";

export default function AppStackLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
        </Stack>
    );
}
