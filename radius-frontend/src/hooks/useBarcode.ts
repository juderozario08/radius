import { useState, useEffect } from "react";
import { Camera } from "expo-camera";

export function useCameraPermission() {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);

    useEffect(() => {
        const requestPermission = async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === "granted");
        };
        requestPermission();
    }, []);

    return hasPermission;
}
