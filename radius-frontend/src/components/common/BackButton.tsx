import { router } from "expo-router";
import { TouchableOpacity, Image } from "react-native"

const BackButton = () => {
    return (
        <TouchableOpacity onPress={router.back}>
            <Image style={{ width: 30, height: 30 }} source={require("@/assets/images/back.png")} />
        </TouchableOpacity>
    )
}

export default BackButton;
