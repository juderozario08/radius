import { View, Text, StyleSheet } from "react-native";

export default function Receiving() {
    return (
        <View style={styles.container}>
            <Text>Receiving</Text>
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
