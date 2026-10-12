import React from "react";
import { Text } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StoreOperationSummary } from "@/types/admin.types";
import { AdminNetworkStats, DashboardSection, SelectedStoreBanner } from "./DashboardPanels";

const store = (id: number, overrides: Partial<StoreOperationSummary> = {}) => ({
    store_id: id,
    name: `Store ${id}`,
    city: "Toronto",
    province: "Ontario",
    active_orders_count: 2,
    active_counts_count: 1,
    pending_pos_count: 3,
    has_active_operations: true,
    ...overrides,
}) as StoreOperationSummary;

it("shows the empty state and its action instead of children", async () => {
    const onClaim = jest.fn();
    await render(
        <DashboardSection
            icon="cart-outline"
            title="My Assigned Orders"
            actionLabel="View Orders →"
            onAction={jest.fn()}
            isEmpty
            emptyIcon="person-outline"
            emptyText="No orders assigned to you yet."
            emptyAction={{ label: "View 3 Store Orders to Claim →", onPress: onClaim }}
        >
            <Text>hidden child</Text>
        </DashboardSection>
    );
    expect(screen.getByText("No orders assigned to you yet.")).toBeTruthy();
    expect(screen.queryByText("hidden child")).toBeNull();
    await fireEvent.press(screen.getByText("View 3 Store Orders to Claim →"));
    expect(onClaim).toHaveBeenCalledTimes(1);
});

it("renders children and the header action when not empty", async () => {
    const onAction = jest.fn();
    await render(
        <DashboardSection icon="flash-outline" title="Store Activity Stream" actionLabel="Actions →" onAction={onAction} isEmpty={false} emptyIcon="pulse-outline" emptyText="none">
            <Text>first activity</Text>
        </DashboardSection>
    );
    expect(screen.getByText("first activity")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Actions →"));
    expect(onAction).toHaveBeenCalledTimes(1);
});

it("totals operations across the store network", async () => {
    await render(<AdminNetworkStats stores={[store(1), store(2, { has_active_operations: false, active_orders_count: 0 })]} />);
    expect(screen.getByLabelText("Active: 1/2")).toBeTruthy();
    expect(screen.getByLabelText("Orders: 2")).toBeTruthy();
    expect(screen.getByLabelText("Counts: 2")).toBeTruthy();
    expect(screen.getByLabelText("POs: 6")).toBeTruthy();
});

it("shows the selected store and returns to all stores", async () => {
    const onBack = jest.fn();
    await render(<SelectedStoreBanner store={store(4, { is_head_office: true })} onBack={onBack} />);
    expect(screen.getByText("Store #4 • Toronto, Ontario")).toBeTruthy();
    expect(screen.getByText("HQ")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Back to all stores"));
    expect(onBack).toHaveBeenCalledTimes(1);
});
