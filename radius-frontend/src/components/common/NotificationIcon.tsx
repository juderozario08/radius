//radius-frontend/src/components/common/NotificationIcon.tsx
import { globalStyles } from "@/constants/styles";
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
                style={globalStyles.headerImageSize}
            />
        </TouchableOpacity>
    )
}

export default NotificationIconComponent;
