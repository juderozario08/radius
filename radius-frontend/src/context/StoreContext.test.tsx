import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import Toast from "react-native-toast-message";
import { apiFetch, UnauthorizedError } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { resetSessionExpiry } from "@/utils/helpers";
import { StoreProvider } from "./StoreContext";

jest.mock("@/api/client", () => ({
    apiFetch: jest.fn(),
    apiFetchSWR: jest.fn(),
    clearSWRCache: jest.fn(),
    setClientContext: jest.fn(),
    UnauthorizedError: class UnauthorizedError extends Error {},
}));
jest.mock("@/hooks/useAuth", () => ({ useAuth: jest.fn() }));
jest.mock("react-native-toast-message", () => ({ show: jest.fn() }));

const logout = jest.fn().mockResolvedValue(undefined);

beforeEach(() => {
    jest.clearAllMocks();
    resetSessionExpiry();
    (useAuth as jest.Mock).mockReturnValue({
        user: { store_id: 3, role: "MANAGER" },
        isAuthenticated: true,
        isLoading: false,
        logout,
    });
});

it("logs out when the store request is unauthorized", async () => {
    (apiFetch as jest.Mock).mockRejectedValue(new UnauthorizedError("Invalid or expired session"));
    await render(<StoreProvider>{null}</StoreProvider>);
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(Toast.show).toHaveBeenCalledTimes(1);
});

it("keeps the session when the store request fails for another reason", async () => {
    (apiFetch as jest.Mock).mockRejectedValue(new TypeError("Network request failed"));
    await render(<StoreProvider>{null}</StoreProvider>);
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(logout).not.toHaveBeenCalled();
});
