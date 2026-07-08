import { View, Text, StyleSheet } from "react-native";

export default function Activities() {
    return (
        <View style={styles.container}>
            <Text>Activities</Text>
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
