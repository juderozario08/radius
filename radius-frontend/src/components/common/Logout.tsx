//radius-frontend/src/components/common/Logout.tsx
import { apiFetch, UnauthorizedError } from "@/api/client";
import { ENDPOINTS } from "@/constants/routes";
import { globalStyles } from "@/constants/styles";
import { useAuth } from "@/hooks/useAuth";
import { LogoutResponse } from "@/types/auth.types";
import { TouchableOpacity, Image, Alert } from "react-native"
import Toast from "react-native-toast-message";

const LogoutComponent = () => {
    const { logout } = useAuth();

    async function submitLogout() {
        try {
            const res = await apiFetch<LogoutResponse>(ENDPOINTS.AUTHENTICATED.logout, {
                method: "POST",
            });
            await logout();
            Toast.show({
                type: "success",
                text1: res.message,
                visibilityTime: 3000,
                autoHide: true,
                position: "bottom",
            });
        } catch (err) {
            console.error(err);
            Alert.alert("An error occured", String(err));
            if (err instanceof UnauthorizedError) {
                await logout();
            }
        }
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
