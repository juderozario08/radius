//radius-frontend/src/components/common/BackButton.tsx
import { globalStyles } from "@/constants/styles";
import { router } from "expo-router";
import { TouchableOpacity, Image } from "react-native"

const BackButton = () => {
    return (
        <TouchableOpacity onPress={router.back}>
            <Image style={globalStyles.headerImageSize} source={require("@/assets/images/back.png")} />
        </TouchableOpacity>
    )
}

export default BackButton;
