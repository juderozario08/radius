import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { OrderCancelModal } from "./OrderActionModals";

it("submits the selected cancellation reason", async () => {
    const onSubmit = jest.fn();
    await render(<OrderCancelModal visible orderId={17} isSaving={false} onClose={jest.fn()} onSubmit={onSubmit} />);

    await fireEvent.press(screen.getByText("Store Unable to Process Order"));
    await fireEvent.press(screen.getByText("Cancel Order"));

    expect(onSubmit).toHaveBeenCalledWith("Store Unable to Process Order");
});
