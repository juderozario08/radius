//radius-frontend/app/(app)/home/actions/back_room/Returns.tsx
import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { View, Text, StyleSheet } from "react-native";

export default function Returns() {
    return (
        <View style={{ flex: 1 }}>
            <HeaderComponent
                headerLeft={(<BackButton />)}
                headerCenter={(
                    <View style={{ flexDirection: 'row' }}>
                        <Text>Returns</Text>
                    </View>
                )} />
            <View style={styles.container}>
                <Text>Returns</Text>
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
