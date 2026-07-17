//radius-frontend/src/components/common/Logout.tsx
import { apiFetch, UnauthorizedError } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { LogoutResponse } from "@/types/auth.types";
import { TouchableOpacity, Image, Alert } from "react-native"
import Toast from "react-native-toast-message";

const LogoutComponent = () => {
    const { logout } = useAuth();

    async function submitLogout() {
        try {
            const res = await apiFetch<LogoutResponse>("/api/logout", {
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
                style={{
                    width: 30,
                    height: 30,
                    marginLeft: 10
                }}
            />
        </TouchableOpacity>
    )
}

export default LogoutComponent;
