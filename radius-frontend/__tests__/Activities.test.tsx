import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react-native";
import { callApi } from "@/utils/helpers";
import Activities from "../app/(app)/(tabs)/home/actions/sales_floor/Activities";

const RefreshControlMock = jest.requireActual("react-native/jest/mocks/RefreshControl").default;

jest.mock("@/utils/helpers", () => ({ callApi: jest.fn() }));
jest.mock("@/hooks/useWebSocket", () => ({ useWebSocket: jest.fn() }));
jest.mock("@/hooks/useAuth", () => {
    const auth = { logout: jest.fn(), user: { store_id: 3, employee_id: 7, role: "MANAGER" } };
    return { useAuth: () => auth };
});
jest.mock("@/components/common/BackButton", () => () => null);
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("@react-navigation/material-top-tabs", () => ({
    createMaterialTopTabNavigator: () => ({
        Navigator: ({ children }: { children: React.ReactNode }) => children,
        Screen: ({ name, children }: { name: string; children: () => React.ReactNode }) =>
            name === "Tasks" ? children() : null,
    }),
}));

const order = {
    order_id: 41,
    store_id: 3,
    customer_name: "Ada",
    order_type: "BOPIS",
    status: "PENDING",
    total_amount: 1000,
    placed_at: "2026-10-10T10:00:00Z",
};
const count = (status: string) => ({
    count_id: 9,
    store_id: 3,
    category_id: 1,
    category_name: "Tools",
    status,
    total_items: 4,
    counted_items: 1,
    total_variance_cost: 0,
    count_date: "2026-10-09T10:00:00Z",
});

function mockResponses({ orders, counts }: { orders: unknown; counts: unknown }) {
    (callApi as jest.Mock).mockImplementation(async (endpoint: string) => {
        if (endpoint.includes("dashboard_only")) return orders;
        if (endpoint.includes("orders/online")) return orders && { online_orders: [] };
        if (endpoint.includes("cycle")) return counts;
        return [];
    });
}

it("keeps the last orders when every order fetch fails on refresh", async () => {
    mockResponses({ orders: { online_orders: [order] }, counts: [count("IN PROGRESS")] });
    await render(<Activities />);
    await screen.findByText("BOPIS Order #41");
    expect(screen.getByText("Status: IN PROGRESS • Progress: 1/4")).toBeTruthy();

    mockResponses({ orders: null, counts: [count("NOT STARTED")] });
    await act(async () => RefreshControlMock.latestRef.props.onRefresh());

    await waitFor(() => expect(screen.getByText("Status: NOT STARTED • Progress: 1/4")).toBeTruthy());
    expect(screen.getByText("BOPIS Order #41")).toBeTruthy();
});
