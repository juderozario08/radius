import { globalStyles } from "@/constants/styles";
import { useAuth } from "@/hooks/useAuth";
import { showToast } from "@/utils/helpers";
import { TouchableOpacity, Image } from "react-native"

const LogoutComponent = () => {
    const { logout } = useAuth();

    async function submitLogout() {
        await logout();
        showToast("success", "Successfully logged out");
    }

    return (
        <TouchableOpacity onPress={submitLogout}>
            <Image
                source={require("@/assets/images/logout.png")}
                style={globalStyles.headerImageSize}
            />
        </TouchableOpacity>
    )
}

export default LogoutComponent;
