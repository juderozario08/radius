import { useCallback, useRef, useState } from "react";
import { Animated } from "react-native";

export function useToast(visibleMs = 3500) {
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const toastOpacity = useRef(new Animated.Value(0)).current;

    const showToast = useCallback((message: string) => {
        setToastMessage(message);
        Animated.sequence([
            Animated.timing(toastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
            Animated.delay(visibleMs),
            Animated.timing(toastOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
        ]).start(() => setToastMessage(null));
    }, [toastOpacity, visibleMs]);

    return { toastMessage, toastOpacity, showToast };
}
