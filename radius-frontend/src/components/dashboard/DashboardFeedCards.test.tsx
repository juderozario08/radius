import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { CycleCountUpdatedPayload, StoreActivityPayload } from "@/types/websocket.types";
import { DashboardActivityCard, DashboardCycleCountCard } from "./DashboardFeedCards";

it("shows cycle count progress and opens the selected count", async () => {
    const onPress = jest.fn();
    const count: CycleCountUpdatedPayload = {
        count_id: 7,
        store_id: 1,
        category_id: 2,
        category_name: "Paint",
        status: "IN PROGRESS",
        action: "scanned",
        total_items: 8,
        counted_items: 2,
        total_variance_cost: -3.25,
        updated_at: "2026-10-11T00:00:00Z",
    };
    await render(<DashboardCycleCountCard count={count} onPress={onPress} />);
    expect(screen.getByText("Count #7 • Action: scanned")).toBeTruthy();
    expect(screen.getByText("Variance: -$3.25")).toBeTruthy();
    await fireEvent.press(screen.getByText("Paint"));
    expect(onPress).toHaveBeenCalledTimes(1);
});

it("shows an activity and opens it", async () => {
    const onPress = jest.fn();
    const activity: StoreActivityPayload = {
        activity_id: "a1",
        store_id: 1,
        activity_type: "ORDER_PLACED",
        title: "New Order",
        description: "Customer placed an order",
        timestamp: "2026-10-11T00:00:00Z",
    };
    await render(<DashboardActivityCard activity={activity} onPress={onPress} />);
    await fireEvent.press(screen.getByText("New Order"));
    expect(onPress).toHaveBeenCalledTimes(1);
});
