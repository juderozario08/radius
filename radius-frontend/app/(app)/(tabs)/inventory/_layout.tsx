import { Stack } from 'expo-router'

export { RouteErrorBoundary as ErrorBoundary } from "@/components/common/RouteErrorBoundary";

export default function Layout() { return <Stack screenOptions={{ headerShown: false }} /> }
