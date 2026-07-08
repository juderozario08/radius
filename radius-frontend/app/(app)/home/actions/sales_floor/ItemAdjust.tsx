
import { View, Text, StyleSheet } from "react-native";

export default function ItemAdjust() {
    return (
        <View style={styles.container}>
            <Text>ItemAdjust</Text>
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
