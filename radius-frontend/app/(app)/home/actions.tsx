import { router, Href } from "expo-router";
import { View, Text, StyleSheet, SafeAreaView, Image, ImageSourcePropType, TouchableOpacity } from "react-native";

type BackRoomKeys = 'receive' | 'cycle_count' | 'returns';
type SalesFloorKeys = 'mims' | 'search' | 'is4tc' | 'fill_report' | 'item_adjust' | 'activities' | 'orders';

type ButtonConfig = {
    title: string;
    path: Href;
    imagePath: ImageSourcePropType;
};

const backRoomMapping: Record<BackRoomKeys, ButtonConfig> = {
    receive: { title: 'Receive', path: '/(app)/home/actions/back_room/Receive', imagePath: require('@/assets/images/receiving.png') },
    cycle_count: { title: 'Cycle Count', path: '/(app)/home/actions/back_room/CycleCount', imagePath: require('@/assets/images/cycle_count.png') },
    returns: { title: 'Returns', path: '/(app)/home/actions/back_room/Returns', imagePath: require('@/assets/images/returns.png') }
};

const salesFloorMapping: Record<SalesFloorKeys, ButtonConfig> = {
    mims: { title: 'MIMS', path: '/(app)/home/actions/sales_floor/Mims', imagePath: require('@/assets/images/mims.png') },
    search: { title: 'Search', path: '/(app)/home/actions/sales_floor/Search', imagePath: require('@/assets/images/search.png') },
    is4tc: { title: 'IS4TC', path: '/(app)/home/actions/sales_floor/IS4TC', imagePath: require('@/assets/images/is4tc.png') },
    fill_report: { title: 'Fill Report', path: '/(app)/home/actions/sales_floor/FillReport', imagePath: require('@/assets/images/fill_report.png') },
    item_adjust: { title: 'Item Adjust', path: '/(app)/home/actions/sales_floor/ItemAdjust', imagePath: require('@/assets/images/item_adjust.png') },
    activities: { title: 'Activities', path: '/(app)/home/actions/sales_floor/Activities', imagePath: require('@/assets/images/activities.png') },
    orders: { title: 'Orders', path: '/(app)/home/actions/sales_floor/OnlineOrders', imagePath: require('@/assets/images/orders.png') }
};

export default function Actions() {
    return (
        <SafeAreaView style={styles.container}>
            {/* Back Room Section */}
            <Text style={styles.sectionTitle}>Back Room</Text>
            <View style={styles.grid}>
                {Object.entries(backRoomMapping).map(([key, config]) => (
                    <View >
                        <TouchableOpacity
                            style={styles.button}
                            key={key}
                            onPress={() => router.push(config.path)}
                        >
                            <Image source={config.imagePath} style={{ width: 30, height: 30 }} />
                        </TouchableOpacity>
                        <Text style={styles.buttonText}>{config.title}</Text>
                    </View>
                ))}
            </View>

            {/* Sales Floor Section */}
            <Text style={[styles.sectionTitle, { marginTop: 50 }]}>Sales Floor</Text>
            <View style={styles.grid}>
                {Object.entries(salesFloorMapping).map(([key, config]) => (
                    <View>
                        <TouchableOpacity
                            style={styles.button}
                            key={key}
                            onPress={() => router.push(config.path)}
                        >
                            <Image source={config.imagePath} style={{ width: 30, height: 30 }} />
                        </TouchableOpacity>
                        <Text style={styles.buttonText}>{config.title}</Text>
                    </View>
                ))}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 10,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 10,
        marginLeft: 15,
        color: '#333',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignContent: 'flex-start',
        gap: 10,
        paddingHorizontal: 10
    },
    button: {
        backgroundColor: "#C70202",
        paddingVertical: 25,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        width: 88,
        marginBottom: 5
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
        textAlign: 'center',
    }
});
