//radius-frontend/app/(app)/home/actions/index.tsx
import { Href, router } from "expo-router";
import { View, Text, StyleSheet, Image, ImageSourcePropType, TouchableOpacity, ScrollView } from "react-native";
import Gate from "@/components/common/Gate";
import { Permission } from "@/utils/roles";

type ButtonConfig = {
    title: string;
    path: Href;
    imagePath: ImageSourcePropType;
    permission?: Permission;
};

const backRoomMapping: ButtonConfig[] = [
    { title: 'Receiving', path: '/(app)/(tabs)/home/actions/back_room/Receiving', imagePath: require('@/assets/images/receiving.png') },
    { title: 'Cycle Count', path: '/(app)/(tabs)/home/actions/back_room/CycleCount', imagePath: require('@/assets/images/cycle_count.png') },
    { title: 'Returns', path: '/(app)/(tabs)/home/actions/back_room/Returns', imagePath: require('@/assets/images/returns.png') }
]

const salesFloorMapping: ButtonConfig[] = [
    { title: 'MIMS', path: '/(app)/(tabs)/home/actions/sales_floor/Mims', imagePath: require('@/assets/images/mims.png') },
    { title: 'Search', path: '/(app)/(tabs)/home/actions/sales_floor/Search', imagePath: require('@/assets/images/search.png') },
    { title: 'IS4TC', path: '/(app)/(tabs)/home/actions/sales_floor/IS4TC', imagePath: require('@/assets/images/is4tc.png') },
    { title: 'Fill Report', path: '/(app)/(tabs)/home/actions/sales_floor/FillReport', imagePath: require('@/assets/images/fill_report.png') },
    { title: 'Item Adjust', path: '/(app)/(tabs)/home/actions/sales_floor/ItemAdjust', imagePath: require('@/assets/images/item_adjust.png') },
    { title: 'Activities', path: '/(app)/(tabs)/home/actions/sales_floor/Activities', imagePath: require('@/assets/images/activities.png') },
    { title: 'Orders', path: '/(app)/(tabs)/home/actions/sales_floor/Orders', imagePath: require('@/assets/images/orders.png') }
];

const adminActionsMapping: ButtonConfig[] = [
    { title: 'Employees', path: '/(app)/(tabs)/home/actions/admin/Employees', imagePath: require('@/assets/images/employees.png') },
]

const Subsection = ({ title, mapping }: { title: string, mapping: ButtonConfig[] }) => {
    return (
        <View>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.grid}>
                {mapping.map((config, key) => (
                    <View key={key}>
                        <TouchableOpacity style={styles.button} onPress={() => router.navigate(config.path)}>
                            <Image source={config.imagePath} style={{ width: 30, height: 30 }} />
                        </TouchableOpacity>
                        <Text style={styles.buttonText}>{config.title}</Text>
                    </View>
                ))}
            </View>
        </View>
    )
}

export default function Actions() {
    return (
        <View style={{ flex: 1 }}>
            <ScrollView>
                <View style={styles.container}>
                    {/* Only employees with the 'view_back_room' permission will see this */}
                    <Gate permission="view_back_room">
                        <Subsection title="Back Room" mapping={backRoomMapping} />
                        <View style={{ marginTop: 50 }} />
                    </Gate>

                    {/* Only employees with the 'view_sales_floor' permission will see this */}
                    <Gate permission="view_sales_floor">
                        <Subsection title="Sales Floor" mapping={salesFloorMapping} />
                        <View style={{ marginTop: 50 }} />
                    </Gate>

                    {/* Only employees with the 'view_admin_actions' permission will see this */}
                    <Gate permission="view_admin_actions">
                        <Subsection title="Admin Actions" mapping={adminActionsMapping} />
                    </Gate>
                </View>
            </ScrollView>
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
