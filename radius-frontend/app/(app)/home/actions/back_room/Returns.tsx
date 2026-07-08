import { View, Text, StyleSheet } from "react-native";

export default function Returns() {
    return (
        <View style={styles.container}>
            <Text>Returns</Text>
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
