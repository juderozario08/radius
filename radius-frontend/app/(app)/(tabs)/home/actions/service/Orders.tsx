//radius-frontend/app/(app)/home/actions/service/Orders.tsx
import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { globalStyles } from "@/constants/styles";
import { View, Text } from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";

export default function Orders() {
    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerLeft={(<BackButton />)}
                headerCenter={(
                    <View style={{ flexDirection: 'row' }}>
                        <Text style={globalStyles.headerTitle}>Print Orders</Text>
                    </View>
                )} />
            <View style={globalStyles.centerElement}>
                <Text>Print Orders</Text>
            </View>
        </TopSafeAreaView>
    )
}
