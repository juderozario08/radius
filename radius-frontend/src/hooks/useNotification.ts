import Toast from 'react-native-toast-message';

export const useNotifications = () => {

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

