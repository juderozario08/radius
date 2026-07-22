//radius-frontend/app/(app)/home/actions/index.tsx
import Gate from "@/components/common/Gate";
import HeaderComponent from "@/components/common/HeaderComponent";
import LogoutComponent from "@/components/common/Logout";
import NotificationIconComponent from "@/components/common/NotificationIcon";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import { globalStyles } from "@/constants/styles";
import { Permission } from "@/utils/roles";
import { Href, router } from "expo-router";
import { Image, ImageSourcePropType, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
    { title: 'MIMS', path: '/(app)/(tabs)/inventory', imagePath: require('@/assets/images/mims.png') },
    { title: 'IS4TC', path: '/(app)/(tabs)/home/actions/sales_floor/IS4TC', imagePath: require('@/assets/images/is4tc.png') },
    { title: 'Fill Report', path: '/(app)/(tabs)/home/actions/sales_floor/FillReport', imagePath: require('@/assets/images/fill_report.png') },
    { title: 'Item Adjust', path: '/(app)/(tabs)/home/actions/sales_floor/ItemAdjust', imagePath: require('@/assets/images/item_adjust.png') },
    { title: 'Activities', path: '/(app)/(tabs)/home/actions/sales_floor/Activities', imagePath: require('@/assets/images/activities.png') },
    { title: 'Orders', path: '/(app)/(tabs)/home/actions/sales_floor/Orders', imagePath: require('@/assets/images/orders.png') },
    { title: 'Transactions', path: '/(app)/(tabs)/home/actions/sales_floor/Transactions', imagePath: require('@/assets/images/transactions.png') },
];

const adminActionsMapping: ButtonConfig[] = [
    { title: 'Employees', path: '/(app)/(tabs)/home/actions/admin/Employees', imagePath: require('@/assets/images/employees.png') },
    { title: 'Sessions', path: '/(app)/(tabs)/home/actions/admin/Sessions', imagePath: require('@/assets/images/sessions.png') },
]

const serviceActionsMapping: ButtonConfig[] = [
    { title: 'Print Orders', path: '/(app)/(tabs)/home/actions/service/Orders', imagePath: require('@/assets/images/print_orders.png') },
]

const Subsection = ({ title, mapping }: { title: string, mapping: ButtonConfig[] }) => {
    return (
        <View>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.grid}>
                {mapping.map((config, key) => (
                    <View key={key}>
                        <TouchableOpacity style={styles.button} onPress={() => router.navigate(config.path)}>
                            <Image source={config.imagePath} style={globalStyles.headerImageSize} />
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
        <TopSafeAreaView>
            <HeaderComponent headerRight={[<NotificationIconComponent />, <LogoutComponent />]} />
            <ScrollView>
                <View style={[globalStyles.container, { paddingHorizontal: 10, gap: 50 }]}>
                    {/* Only employees with the 'view_admin_actions' permission will see this */}
                    <Gate permission="view_admin_actions">
                        <Subsection title="Admin Actions" mapping={adminActionsMapping} />
                    </Gate>

                    {/* Only employees with the 'view_back_room' permission will see this */}
                    <Gate permission="view_back_room">
                        <Subsection title="Back Room" mapping={backRoomMapping} />
                    </Gate>

                    {/* Only employees with the 'view_sales_floor' permission will see this */}
                    <Gate permission="view_sales_floor">
                        <Subsection title="Sales Floor" mapping={salesFloorMapping} />
                    </Gate>

                    {/* Only employees with the 'view_service_actions' permission will see this */}
                    <Gate permission="view_service_actions">
                        <Subsection title="Service Actions" mapping={serviceActionsMapping} />
                    </Gate>
                </View>
            </ScrollView>
        </TopSafeAreaView>
    );
}

const styles = StyleSheet.create({
    sectionTitle: {
        fontSize: 24,
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
        width: 75,
        marginBottom: 5
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
        textAlign: 'center',
    }
});
