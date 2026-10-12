import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { ReturnRejectModal } from "./ReturnRejectModal";

it("submits a rejection reason through a modal control", async () => {
    const onReject = jest.fn(async () => {});
    const onClose = jest.fn();
    await render(<ReturnRejectModal returnId={23} isProcessing={false} onClose={onClose} onReject={onReject} />);

    await fireEvent.changeText(screen.getByLabelText("Rejection reason"), "  Damaged item  ");
    await fireEvent.press(screen.getByText("Reject Return"));

    await waitFor(() => expect(onReject).toHaveBeenCalledWith(23, "Damaged item"));
    expect(onClose).toHaveBeenCalledTimes(1);
});
