//radius-frontend/src/components/common/NotificationIcon.tsx
import { useNotifications } from "@/hooks/useNotification";
import { TouchableOpacity, Image } from "react-native"

const NotificationIconComponent = () => {
    const { getNotifications } = useNotifications();

    return (
        <TouchableOpacity onPress={() => {
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
