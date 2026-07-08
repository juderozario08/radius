import { View, Text, StyleSheet } from "react-native";

export default function CycleCount() {
    return (
        <View style={styles.container}>
            <Text>Cycle Count</Text>
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
