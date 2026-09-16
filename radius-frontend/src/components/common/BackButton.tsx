import React, { useEffect, useCallback } from "react";
import { globalStyles } from "@/constants/styles";
import { router, useLocalSearchParams } from "expo-router";
import {
    TouchableOpacity,
    Image,
    BackHandler,
    GestureResponderEvent,
    StyleProp,
    ViewStyle,
    ImageStyle,
} from "react-native";

export interface BackButtonProps {
    onPress?: (event?: GestureResponderEvent) => void;
    fallbackUrl?: string;
    style?: StyleProp<ViewStyle>;
    imageStyle?: StyleProp<ImageStyle>;
}

const BackButton: React.FC<BackButtonProps> = ({
    onPress,
    fallbackUrl,
    style,
    imageStyle,
}) => {
    const params = useLocalSearchParams<{ from?: string }>();
    const from = fallbackUrl || params.from;

    const handlePress = useCallback(
        (event?: GestureResponderEvent) => {
            if (onPress) {
                onPress(event);
                return;
            }

            if (from === "dashboard" || from === "/(app)/(tabs)/home/dashboard") {
                if (router.canGoBack()) {
                    router.back();
                }
                router.navigate("/(app)/(tabs)/home/dashboard");
                return;
            }

            if (from) {
                if (router.canGoBack()) {
                    router.back();
                }
                router.navigate(from as any);
                return;
            }

            if (router.canGoBack()) {
                router.back();
            } else {
                router.navigate("/(app)/(tabs)/home/dashboard");
            }
        },
        [onPress, from]
    );

    useEffect(() => {
        if (!from) return;

        const onHardwareBack = () => {
            handlePress();
            return true;
        };

        const subscription = BackHandler.addEventListener(
            "hardwareBackPress",
            onHardwareBack
        );
        return () => subscription.remove();
    }, [from, handlePress]);

    return (
        <TouchableOpacity onPress={handlePress} style={style} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Image
                style={[globalStyles.headerImageSize, imageStyle]}
                source={require("@/assets/images/back.png")}
            />
        </TouchableOpacity>
    );
};

export default BackButton;
