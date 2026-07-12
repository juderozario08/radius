import { useNotifications } from "@/hooks/useNotification";
import { router } from "expo-router";
import { TouchableOpacity, Image } from "react-native"

const NotificationIconComponent = () => {
    const { getNotifications } = useNotifications();

    return (
        <TouchableOpacity onPress={() => {
            router.push('/(app)/notifications');
            getNotifications();
        }}>
            <Image
                source={require("@/assets/images/notification-bell.png")}
                style={{
                    width: 30,
                    height: 30,
                }}
            />
        </TouchableOpacity>
    )
}

export default NotificationIconComponent;
