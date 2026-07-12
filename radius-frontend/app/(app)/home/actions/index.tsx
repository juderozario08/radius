import HeaderComponent from "@/components/common/HeaderComponent";
import LogoutComponent from "@/components/common/Logout";
import NotificationIconComponent from "@/components/common/Notification";
import { Href, router } from "expo-router";
import { View, Text, StyleSheet, Image, ImageSourcePropType, TouchableOpacity } from "react-native";

type ButtonConfig = {
    title: string;
    path: Href;
    imagePath: ImageSourcePropType;
};

const backRoomMapping: ButtonConfig[] = [
    { title: 'Receiving', path: '/(app)/home/actions/back_room/Receiving', imagePath: require('@/assets/images/receiving.png') },
    { title: 'Cycle Count', path: '/(app)/home/actions/back_room/CycleCount', imagePath: require('@/assets/images/cycle_count.png') },
    { title: 'Returns', path: '/(app)/home/actions/back_room/Returns', imagePath: require('@/assets/images/returns.png') }
]

const salesFloorMapping: ButtonConfig[] = [
    { title: 'MIMS', path: '/(app)/inventory', imagePath: require('@/assets/images/mims.png') },
    { title: 'Search', path: '/(app)/home/actions/sales_floor/Search', imagePath: require('@/assets/images/search.png') },
    { title: 'IS4TC', path: '/(app)/home/actions/sales_floor/IS4TC', imagePath: require('@/assets/images/is4tc.png') },
    { title: 'Fill Report', path: '/(app)/home/actions/sales_floor/FillReport', imagePath: require('@/assets/images/fill_report.png') },
    { title: 'Item Adjust', path: '/(app)/home/actions/sales_floor/ItemAdjust', imagePath: require('@/assets/images/item_adjust.png') },
    { title: 'Activities', path: '/(app)/home/actions/sales_floor/Activities', imagePath: require('@/assets/images/activities.png') },
    { title: 'Orders', path: '/(app)/home/actions/sales_floor/Orders', imagePath: require('@/assets/images/orders.png') }
];

export default function Actions() {
    return (
        <View style={{ flex: 1 }}>
            <HeaderComponent
                headerRight={(
                    <View style={{ flexDirection: 'row' }}>
                        <NotificationIconComponent />
                        <LogoutComponent />
                    </View>
                )} />
            <View style={styles.container}>
                {/* Back Room Section */}
                <Text style={styles.sectionTitle}>Back Room</Text>
                <View style={styles.grid}>
                    {backRoomMapping.map((config, key) => (
                        <View key={key}>
                            <TouchableOpacity style={styles.button} onPress={() => router.navigate(config.path)}>
                                <Image source={config.imagePath} style={{ width: 30, height: 30 }} />
                            </TouchableOpacity>
                            <Text style={styles.buttonText}>{config.title}</Text>
                        </View>
                    ))}
                </View>

                {/* Sales Floor Section */}
                <Text style={[styles.sectionTitle, { marginTop: 50 }]}>Sales Floor</Text>
                <View style={styles.grid}>
                    {salesFloorMapping.map((config, key) => (
                        <View key={key}>
                            <TouchableOpacity style={styles.button} onPress={() => router.navigate(config.path)}>
                                <Image source={config.imagePath} style={{ width: 30, height: 30 }} />
                            </TouchableOpacity>
                            <Text style={styles.buttonText}>{config.title}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
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
        width: 83,
        marginBottom: 5
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
        textAlign: 'center',
    }
});
