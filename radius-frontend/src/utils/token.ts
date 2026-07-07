import * as SecureStore from "expo-secure-store";

const KEY = "auth_token";

export async function saveToken(token: string) {
    await SecureStore.setItemAsync(KEY, token);
}

export async function getToken() {
    return await SecureStore.getItemAsync(KEY);
}

export async function deleteToken() {
    await SecureStore.deleteItemAsync(KEY);
}
