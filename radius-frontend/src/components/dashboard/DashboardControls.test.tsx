import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { DashboardControls } from "./DashboardControls";

it("switches scope and active tabs", async () => {
    const onScopeChange = jest.fn();
    const onTabChange = jest.fn();
    const onOpenOrders = jest.fn();
    const onOpenCycleCounts = jest.fn();
    const onOpenActivities = jest.fn();

    await render(
        <DashboardControls
            scope="my_tasks"
            tab="overview"
            myOrderCount={3}
            storeOrderCount={12}
            orderCount={7}
            cycleCount={5}
            activityCount={8}
            onScopeChange={onScopeChange}
            onTabChange={onTabChange}
            onOpenOrders={onOpenOrders}
            onOpenCycleCounts={onOpenCycleCounts}
            onOpenActivities={onOpenActivities}
        />
    );

    expect(screen.getByText("My Tasks")).toBeTruthy();
    expect(screen.getByText("Store-Wide")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();

    await fireEvent.press(screen.getByText("Store-Wide"));
    expect(onScopeChange).toHaveBeenCalledWith("store_wide");

    await fireEvent.press(screen.getByText("Live Orders (7)"));
    expect(onTabChange).toHaveBeenCalledWith("orders");
});

it("opens target screen when pressing active metric card", async () => {
    const onScopeChange = jest.fn();
    const onTabChange = jest.fn();
    const onOpenOrders = jest.fn();
    const onOpenCycleCounts = jest.fn();
    const onOpenActivities = jest.fn();

    await render(
        <DashboardControls
            scope="store_wide"
            tab="orders"
            myOrderCount={0}
            storeOrderCount={4}
            orderCount={4}
            cycleCount={2}
            activityCount={6}
            onScopeChange={onScopeChange}
            onTabChange={onTabChange}
            onOpenOrders={onOpenOrders}
            onOpenCycleCounts={onOpenCycleCounts}
            onOpenActivities={onOpenActivities}
        />
    );

    await fireEvent.press(screen.getByText("Live Orders"));
    expect(onOpenOrders).toHaveBeenCalledTimes(1);
});
