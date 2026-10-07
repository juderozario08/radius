import React, { useContext } from "react";
import { act, render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import * as SecureStore from "expo-secure-store";
import { apiFetch, resetClientContext, setClientContext } from "@/api/client";
import { deleteRefreshToken, deleteToken, getToken, saveRefreshToken, saveToken } from "@/utils/token";
import { AuthContext, AuthProvider } from "./AuthContext";

jest.mock("@/api/client", () => ({ apiFetch: jest.fn(), resetClientContext: jest.fn(), setClientContext: jest.fn() }));
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

it("deletes stale credentials when verification fails", async () => {
    (getToken as jest.Mock).mockResolvedValue("stale");
    (apiFetch as jest.Mock).mockRejectedValue(new Error("expired"));
    await render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText("signed-out")).toBeTruthy());
    expect(deleteToken).toHaveBeenCalled();
    expect(deleteRefreshToken).toHaveBeenCalled();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("user_info");
});
