import { Stack } from 'expo-router';

export default function ActionsLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="back_room/Receiving" />
            <Stack.Screen name="back_room/CycleCount" />
            <Stack.Screen name="back_room/Returns" />
            <Stack.Screen name="sales_floor/Mims" />
            <Stack.Screen name="sales_floor/Search" />
            <Stack.Screen name="sales_floor/IS4TC" />
            <Stack.Screen name="sales_floor/FillReport" />
            <Stack.Screen name="sales_floor/ItemAdjust" />
            <Stack.Screen name="sales_floor/Activities" />
            <Stack.Screen name="sales_floor/Orders" />
        </Stack>
    );
}
