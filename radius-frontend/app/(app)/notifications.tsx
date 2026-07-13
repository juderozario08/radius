//radius-frontend/app/(app)/notifications.tsx
import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { useEffect } from "react";
import { View, Text } from "react-native";

const Notifications = () => {
    useEffect(() => { }, [])
    return (
        <View style={{ flex: 1 }}>
            <HeaderComponent
                headerLeft={(<BackButton />)}
                headerCenter={(
                    <View style={{ flexDirection: 'row' }}>
                        <Text>Notifications</Text>
                    </View>
                )} />
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text>Notification Screen</Text>
            </View>
        </View>
    )
}


export default Notifications;
