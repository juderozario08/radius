//radius-frontend/app/(app)/home/actions/sales_floor/Mims.tsx
import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { View, Text, StyleSheet } from "react-native";

export default function Mims() {
    return (
        <View style={{ flex: 1 }}>
            <HeaderComponent
                headerLeft={(<BackButton />)}
                headerCenter={(
                    <View style={{ flexDirection: 'row' }}>
                        <Text>Mims</Text>
                    </View>
                )} />
            <View style={styles.container}>
                <Text>Mims</Text>
            </View>
        </View>
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

