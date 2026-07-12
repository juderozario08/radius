/* import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { apiFetch } from '@/api/client'; */
import Toast from 'react-native-toast-message';

export const useNotifications = () => {
    /* useEffect(() => {
        // Register for push notifications and send token to your Go backend
        registerForPushNotifications();
    }, []); */

    /* const getNotifications = async () => {
        // Logic to fetch your app-specific notifications from your Go API
        // return await apiFetch('/notifications');
    }; */

    // NOTE: FIGURE OUT LATER HOW TO DO NOTIFICATIONS VIEW FOR ACTIVITIES GOING ON
    async function getNotifications() {
        Toast.show({
            type: 'info',
            text1: 'Show notifications',
            position: 'bottom',
            visibilityTime: 1000
        })
    }

    return { getNotifications };
};

/* async function registerForPushNotifications() {
    // Standard Expo logic to request permission and get ExpoPushToken
    // Then: await apiFetch('/auth/register-device', { method: 'POST', ... })
} */
