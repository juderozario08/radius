import { globalStyles } from "@/constants/styles";
import { useNotifications } from "@/hooks/useNotification";
import { TouchableOpacity, Image } from "react-native"

const NotificationIconComponent = () => {
    const { getNotifications } = useNotifications();

    return (
        <TouchableOpacity
            onPress={() => {
                getNotifications();
            }}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
        >
            <Image
                source={require("@/assets/images/notification-bell.png")}
                style={globalStyles.headerImageSize}
                accessibilityIgnoresInvertColors
            />
        </TouchableOpacity>
    );
}

export default NotificationIconComponent;
