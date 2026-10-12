import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import { useAuth } from "@/hooks/useAuth";
import { callApi } from "@/utils/helpers";
import Stores from "../../../app/(app)/(tabs)/store/index";

jest.mock("@/hooks/useAuth", () => ({ useAuth: jest.fn() }));
jest.mock("@/utils/helpers", () => ({
    ...jest.requireActual("@/utils/helpers"),
    callApi: jest.fn().mockResolvedValue({ stores: [], total_length: 0 }),
    showToast: jest.fn(),
}));
jest.mock("expo-router", () => ({
    ...jest.requireActual("expo-router"),
    Redirect: ({ href }: { href: string }) => {
        const { Text: MockText } = jest.requireActual("react-native");
        return <MockText>{`redirect:${href}`}</MockText>;
    },
    router: { push: jest.fn(), back: jest.fn() },
}));

const signInAs = (role: string) => (useAuth as jest.Mock).mockReturnValue({ user: { role, store_id: 5 }, logout: jest.fn() });

beforeEach(() => jest.clearAllMocks());

it("sends managers to their store's employees without calling admin endpoints", async () => {
    signInAs("MANAGER");
    await render(<Stores />);
    expect(screen.getByText("redirect:/(app)/(tabs)/store/employees")).toBeTruthy();
    expect(callApi).not.toHaveBeenCalled();
});

it("sends associates home without calling admin endpoints", async () => {
    signInAs("SALES");
    await render(<Stores />);
    expect(screen.getByText("redirect:/(app)/(tabs)/home/dashboard")).toBeTruthy();
    expect(callApi).not.toHaveBeenCalled();
});

it("loads the store list for admins", async () => {
    signInAs("ADMIN");
    await render(<Stores />);
    await waitFor(() => expect(callApi).toHaveBeenCalledWith(expect.stringContaining("/api/admin/stores"), expect.anything(), expect.any(Function)));
});
