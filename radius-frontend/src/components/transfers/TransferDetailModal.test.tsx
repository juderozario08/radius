import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { OutboundTransferDetailResponse } from "@/types/receiving.types";
import { TransferDetailModal } from "./TransferDetailModal";

const transfer: OutboundTransferDetailResponse = {
    transfer_id: 8,
    from_store_id: 1,
    from_store_name: "Origin",
    to_store_id: 2,
    to_store_name: "Destination",
    status: "PENDING",
    requested_by: 1,
    requested_by_name: "Sam Lee",
    transfer_reason: "Restock",
    carrier: null,
    tracking_number: null,
    manual_check_required: false,
    total_transfer_cost: 0,
    created_at: "2026-10-11T00:00:00Z",
    shipped_at: null,
    received_at: null,
    items: [],
};

it("offers dispatch for a pending transfer", async () => {
    const dispatch = jest.fn();
    await render(<TransferDetailModal
        isDetailModalVisible
        setIsDetailModalVisible={jest.fn()}
        isDetailLoading={false}
        transferDetail={transfer}
        isAdmin={false}
        handleCancelTransfer={jest.fn()}
        handleOpenDispatchModal={dispatch}
    />);
    expect(screen.getByText("Transfer #8")).toBeTruthy();
    await fireEvent.press(screen.getByText("Dispatch"));
    expect(dispatch).toHaveBeenCalledWith(8);
});
