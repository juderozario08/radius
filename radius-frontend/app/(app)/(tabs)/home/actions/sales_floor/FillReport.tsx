//radius-frontend/app/(app)/home/actions/sales_floor/FillReport.tsx
import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { View, Text, StyleSheet } from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";

export default function FillReport() {
    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerLeft={(<BackButton />)}
                headerCenter={(
                    <View style={{ flexDirection: 'row' }}>
                        <Text>FillReport</Text>
                    </View>
                )} />
            <View style={styles.container}>
                <Text>FillReport</Text>
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

