//radius-frontend/app/(app)/home/actions/sales_floor/IS4TC.tsx
import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { View, Text, StyleSheet } from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";

export default function IS4TC() {
    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerLeft={(<BackButton />)}
                headerCenter={(
                    <View style={{ flexDirection: 'row' }}>
                        <Text>IS4TC</Text>
                    </View>
                )} />
            <View style={styles.container}>
                <Text>IS4TC</Text>
            </View>
        </TopSafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
})

