import React from "react";
import { render, screen } from "@testing-library/react-native";
import { callApi } from "@/utils/helpers";
import CycleCountScanner from "../app/(app)/(tabs)/home/actions/back_room/CycleCountScanner";

jest.mock("@/utils/helpers", () => ({ callApi: jest.fn() }));
jest.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ logout: jest.fn() }) }));
jest.mock("@/components/common/BackButton", () => () => null);
jest.mock("expo-router", () => ({
    router: { push: jest.fn(), replace: jest.fn() },
    useLocalSearchParams: () => ({ id: "invalid" }),
}));

it("shows an error without fetching when the count ID is invalid", async () => {
    await render(<CycleCountScanner />);
    expect(screen.getByText("Invalid cycle count ID.")).toBeTruthy();
    expect(screen.queryByText("Try again")).toBeNull();
    expect(callApi).not.toHaveBeenCalled();
});
