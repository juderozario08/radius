//radius-frontend/app/(app)/home/actions/sales_floor/Activities.tsx
import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { View, Text, StyleSheet } from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";

export default function Activities() {
    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerLeft={(<BackButton />)}
                headerCenter={(
                    <View style={{ flexDirection: 'row' }}>
                        <Text>Activities</Text>
                    </View>
                )} />
            <View style={styles.container}>
                <Text>Activities</Text>
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
    title: {
    }
})
