import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { ReturnSuccessModal } from "./ReturnSuccessModal";

it("shows approval status and the refund amount", async () => {
    const onClose = jest.fn();
    await render(<ReturnSuccessModal submittedReturn={{ returnId: 9, status: "PENDING_APPROVAL", total: 63.5 }} onClose={onClose} />);

    expect(screen.getByText("Return #9")).toBeTruthy();
    expect(screen.getByText("Refund: $63.50")).toBeTruthy();
    expect(screen.getByText(/requires manager approval/)).toBeTruthy();
    await fireEvent.press(screen.getByText("Done"));
    expect(onClose).toHaveBeenCalledTimes(1);
});
