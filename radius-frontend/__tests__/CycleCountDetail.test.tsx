import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { callApi } from "@/utils/helpers";
import CycleCountDetail from "../app/(app)/(tabs)/home/actions/back_room/CycleCountDetail";

jest.mock("@/utils/helpers", () => ({ callApi: jest.fn(), showToast: jest.fn() }));
jest.mock("@/hooks/useAuth", () => {
    const auth = { logout: jest.fn(), user: { store_id: 3, role: "SALES" } };
    return { useAuth: () => auth };
});
jest.mock("@/components/common/BackButton", () => () => null);
jest.mock("expo-router", () => {
    const { useEffect } = jest.requireActual("react");
    const params = { id: "5" };
    return {
        router: { push: jest.fn(), replace: jest.fn() },
        useLocalSearchParams: () => params,
        useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
    };
});

const detail = {
    count: {
        count_id: 5,
        store_id: 3,
        category_id: 1,
        category_name: "Tools",
        status: "IN PROGRESS",
        total_items: 0,
        counted_items: 0,
        total_variance_cost: 0,
    },
    items: [],
};

it("stays on the screen with a retry when the initial load fails", async () => {
    (callApi as jest.Mock).mockResolvedValueOnce(null).mockResolvedValue(detail);
    await render(<CycleCountDetail />);

    await fireEvent.press(await screen.findByText("Try again"));

    expect(await screen.findByText("Count #5")).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
});
