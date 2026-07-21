//radius-frontend/app/(app)/home/actions/service/Orders.tsx
import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { globalStyles } from "@/constants/styles";
import { View, Text } from "react-native";

export default function Orders() {
    return (
        <View style={{ flex: 1 }}>
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
        </View>
    )
}
