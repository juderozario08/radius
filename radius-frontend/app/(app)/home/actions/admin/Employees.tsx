//radius-frontend/app/(app)/home/actions/admin/Employees.tsx
import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { View, Text, StyleSheet } from "react-native";

export default function Employees() {
    return (
        <View style={{ flex: 1 }}>
            <HeaderComponent
                headerLeft={(<BackButton />)}
                headerCenter={(
                    <View style={{ flexDirection: 'row' }}>
                        <Text>Employees</Text>
                    </View>
                )} />
            <View style={styles.container}>
                <Text>Employees</Text>
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
