import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { TransferCreateModal } from "./TransferCreateModal";

it("selects the destination store for a new transfer", async () => {
    const selectStore = jest.fn();
    await render(<TransferCreateModal
        isCreateModalVisible
        setIsCreateModalVisible={jest.fn()}
        pendingItems={[]}
        destinationStores={[{ store_id: 3, name: "Downtown", city: "Toronto", province: "ON", is_head_office: false }]}
        selectedStoreId={null}
        setSelectedStoreId={selectStore}
        transferReason=""
        setTransferReason={jest.fn()}
        manualCheck={false}
        setManualCheck={jest.fn()}
        productSearchQuery=""
        handleSearchProducts={jest.fn()}
        isSearchingProducts={false}
        searchResults={[]}
        selectedProduct={null}
        handleSelectProduct={jest.fn()}
        itemQtyText="1"
        setItemQtyText={jest.fn()}
        handleAddPendingItem={jest.fn()}
        handleRemovePendingItem={jest.fn()}
        isSubmittingCreate={false}
        handleSubmitCreateTransfer={jest.fn(async () => {})}
    />);
    await fireEvent.press(screen.getByText("Downtown (Toronto)"));
    expect(selectStore).toHaveBeenCalledWith(3);
    expect(screen.getByText("No products added to manifest yet.")).toBeTruthy();
});
