import React, { useContext } from "react";
import { act, render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import * as SecureStore from "expo-secure-store";
import { apiFetch, resetClientContext, setClientContext, UnauthorizedError } from "@/api/client";
import { deleteRefreshToken, deleteToken, getToken, saveRefreshToken, saveToken } from "@/utils/token";
import { AuthContext, AuthProvider } from "./AuthContext";

jest.mock("@/api/client", () => ({
    apiFetch: jest.fn(), resetClientContext: jest.fn(), setClientContext: jest.fn(),
    UnauthorizedError: class UnauthorizedError extends Error {},
}));
jest.mock("@/utils/token", () => ({
    deleteRefreshToken: jest.fn(), deleteToken: jest.fn(), getToken: jest.fn(),
    saveRefreshToken: jest.fn(), saveToken: jest.fn(),
}));
jest.mock("expo-secure-store", () => ({
    getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
}));
jest.mock("react-native-toast-message", () => ({ show: jest.fn() }));

let auth: NonNullable<React.ContextType<typeof AuthContext>>;

function Probe() {
    auth = useContext(AuthContext)!;
    return <Text>{auth.isLoading ? "loading" : auth.isAuthenticated ? "authenticated" : "signed-out"}</Text>;
}

beforeEach(() => {
    jest.clearAllMocks();
    (getToken as jest.Mock).mockResolvedValue(null);
});

it("loads a signed-out state without a stored token", async () => {
    await render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText("signed-out")).toBeTruthy());
    expect(apiFetch).not.toHaveBeenCalled();
});

it("stores login credentials and clears them on logout", async () => {
    await render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText("signed-out")).toBeTruthy());
    const user = { token: "access", refresh_token: "refresh", session_id: 1, employee_id: 2, last_name: "Doe", role: "SALES" as const, store_id: 3 };
    await act(async () => auth.login(user));
    expect(screen.getByText("authenticated")).toBeTruthy();
    expect(saveToken).toHaveBeenCalledWith("access");
    expect(saveRefreshToken).toHaveBeenCalledWith("refresh");
    expect(setClientContext).toHaveBeenCalledWith({ storeId: 3, employeeId: 2 });
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("user_info", JSON.stringify(user));
    (apiFetch as jest.Mock).mockRejectedValue(new Error("offline"));
    await act(async () => auth.logout());
    expect(screen.getByText("signed-out")).toBeTruthy();
    expect(deleteToken).toHaveBeenCalled();
    expect(deleteRefreshToken).toHaveBeenCalled();
    expect(resetClientContext).toHaveBeenCalled();
});

const storedUser = { session_id: 1, employee_id: 2, last_name: "Doe", role: "MANAGER" as const, store_id: 3 };

it("deletes credentials when verification is rejected", async () => {
    (getToken as jest.Mock).mockResolvedValue("stale");
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(storedUser));
    (apiFetch as jest.Mock).mockRejectedValue(new UnauthorizedError("Invalid or expired session"));
    await render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText("signed-out")).toBeTruthy());
    expect(auth.user).toBeNull();
    expect(deleteToken).toHaveBeenCalled();
    expect(deleteRefreshToken).toHaveBeenCalled();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("user_info");
    expect(resetClientContext).toHaveBeenCalled();
});

it.each([
    ["network error", new TypeError("Network request failed")],
    ["timeout", Object.assign(new Error("Request timed out"), { name: "TimeoutError" })],
    ["server error", new Error("An internal error occurred")],
])("keeps the session and restores the stored user on a %s", async (_, error) => {
    (getToken as jest.Mock).mockResolvedValue("access");
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify({ ...storedUser, token: "old", refresh_token: "old-refresh" }));
    (apiFetch as jest.Mock).mockRejectedValue(error);
    await render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText("authenticated")).toBeTruthy());
    expect(auth.token).toBe("access");
    expect(auth.user).toEqual(storedUser);
    expect(setClientContext).toHaveBeenCalledWith({ storeId: 3, employeeId: 2 });
    expect(deleteToken).not.toHaveBeenCalled();
    expect(deleteRefreshToken).not.toHaveBeenCalled();
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
});

it("signs out without deleting tokens when offline with no stored user", async () => {
    (getToken as jest.Mock).mockResolvedValue("access");
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (apiFetch as jest.Mock).mockRejectedValue(new TypeError("Network request failed"));
    await render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText("signed-out")).toBeTruthy());
    expect(auth.user).toBeNull();
    expect(deleteToken).not.toHaveBeenCalled();
    expect(deleteRefreshToken).not.toHaveBeenCalled();
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
});
