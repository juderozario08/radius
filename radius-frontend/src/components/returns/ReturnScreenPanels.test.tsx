import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { RefundSummaryCard, ReturnsTabBar } from "./ReturnScreenPanels";

const summaryProps = {
    itemCount: 2,
    subtotal: 40,
    tax: 5.2,
    total: 45.2,
    needsApproval: false,
    refundMethod: "CARD" as const,
    onRefundMethodChange: jest.fn(),
    storeCreditOnly: false,
    notes: "",
    onNotesChange: jest.fn(),
    isSubmitting: false,
    onSubmit: jest.fn(),
};

it("switches tabs", async () => {
    const onChange = jest.fn();
    await render(<ReturnsTabBar activeTab="NEW_RETURN" onChange={onChange} />);
    await fireEvent.press(screen.getByText("RTV Queue"));
    expect(onChange).toHaveBeenCalledWith("RTV_QUEUE");
});

it("shows the totals and submits the return", async () => {
    const onSubmit = jest.fn();
    await render(<RefundSummaryCard {...summaryProps} onSubmit={onSubmit} />);
    expect(screen.getByText("Subtotal (2 items):")).toBeTruthy();
    expect(screen.getByText("Process Return ($45.20)")).toBeTruthy();
    expect(screen.queryByText(/queued for Manager Approval/)).toBeNull();
    await fireEvent.press(screen.getByText("Process Return ($45.20)"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
});

it("only allows store credit for items outside the policy window and flags approvals", async () => {
    const onRefundMethodChange = jest.fn();
    await render(<RefundSummaryCard {...summaryProps} storeCreditOnly needsApproval refundMethod="STORE_CREDIT" onRefundMethodChange={onRefundMethodChange} />);
    expect(screen.getByText(/Total exceeds \$50.00/)).toBeTruthy();
    await fireEvent.press(screen.getByText("CASH"));
    expect(onRefundMethodChange).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText("STORE CREDIT"));
    expect(onRefundMethodChange).toHaveBeenCalledWith("STORE_CREDIT");
});
