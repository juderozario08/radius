//radius-frontend/app/(app)/home/actions/sales_floor/Search.tsx
import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { View, Text, StyleSheet } from "react-native";

export default function Seach() {
    return (
        <View style={{ flex: 1 }}>
            <HeaderComponent
                headerLeft={(<BackButton />)}
                headerCenter={(
                    <View style={{ flexDirection: 'row' }}>
                        <Text>Seach</Text>
                    </View>
                )} />
            <View style={styles.container}>
                <Text>Seach</Text>
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

