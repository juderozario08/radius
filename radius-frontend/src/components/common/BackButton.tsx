import React, { useEffect, useCallback } from "react";
import { globalStyles } from "@/constants/styles";
import { router, useLocalSearchParams, usePathname } from "expo-router";
import {
    TouchableOpacity,
    Image,
    BackHandler,
    GestureResponderEvent,
    StyleProp,
    ViewStyle,
    ImageStyle,
} from "react-native";
import { navigationTracker, isSameStack } from "@/utils/navigationTracker";

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
    const pathname = usePathname();
    const from = fallbackUrl || params.from;

    const handlePress = useCallback(
        (event?: GestureResponderEvent) => {
            if (onPress) {
                onPress(event);
                return;
            }

            if (from === "dashboard" || from === "/(app)/(tabs)/home/dashboard") {
                if (typeof router.canDismiss === "function" && router.canDismiss()) {
                    router.dismiss();
                }
                router.navigate("/(app)/(tabs)/home/dashboard");
                return;
            }

            if (from === "activities" || from === "/(app)/(tabs)/home/actions/sales_floor/Activities") {
                if (typeof router.canDismiss === "function" && router.canDismiss()) {
                    router.dismiss();
                }
                router.navigate("/(app)/(tabs)/home/actions/sales_floor/Activities" as any);
                return;
            }

            if (from) {
                if (typeof router.canDismiss === "function" && router.canDismiss()) {
                    router.dismiss();
                }
                router.navigate(from as any);
                return;
            }

            const previous = navigationTracker.getPrevious();
            if (previous) {
                navigationTracker.pop();

                const isSame = isSameStack(pathname, previous.pathname);
                if (isSame && router.canGoBack()) {
                    router.back();
                    return;
                }

                if (typeof router.canDismiss === "function" && router.canDismiss()) {
                    router.dismiss();
                }

                if (previous.params && Object.keys(previous.params).length > 0) {
                    const cleanParams: Record<string, any> = {};
                    for (const [k, v] of Object.entries(previous.params)) {
                        if (k !== "screen" && v !== undefined && v !== null && v !== "") {
                            cleanParams[k] = v;
                        }
                    }
                    router.navigate({
                        pathname: previous.pathname as any,
                        params: cleanParams,
                    });
                } else {
                    router.navigate(previous.pathname as any);
                }
                return;
            }

            if (router.canGoBack()) {
                router.back();
            } else {
                router.navigate("/(app)/(tabs)/home/dashboard");
            }
        },
        [onPress, from, pathname]
    );

    useEffect(() => {
        const onHardwareBack = () => {
            handlePress();
            return true;
        };

        const subscription = BackHandler.addEventListener(
            "hardwareBackPress",
            onHardwareBack
        );
        return () => subscription.remove();
    }, [handlePress]);

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
