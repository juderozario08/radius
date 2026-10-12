import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { OriginalTransactionItemForReturn } from "@/types/returns.types";
import { ReturnSaleItemCard } from "./ReturnSaleItemCard";

const item: OriginalTransactionItemForReturn = {
    transaction_item_id: 15,
    product_id: 8,
    product_sku: "SKU-8",
    product_name: "Widget",
    brand: "Example",
    purchased_qty: 3,
    returned_qty: 1,
    returnable_qty: 2,
    unit_price: 12.5,
    net_line_total: 37.5,
    unit_cost: 8,
    is_returnable: true,
    return_window_days: 30,
    is_outside_policy_window: false,
};

it("routes quantity and reason changes for the selected sale item", async () => {
    const toggleItemSelection = jest.fn();
    const updateItemQuantity = jest.fn();
    const updateItemReason = jest.fn();
    const updateItemDisposition = jest.fn();
    await render(<ReturnSaleItemCard
        item={item}
        selectedData={{
            product_id: 8,
            product_name: "Widget",
            product_sku: "SKU-8",
            unit_price: 12.5,
            line_net_total: 37.5,
            purchased_qty: 3,
            already_returned_qty: 1,
            quantity: 1,
            max_returnable: 2,
            return_reason: "DEFECTIVE",
            disposition: "DEFECTIVE_RTV",
            is_outside_policy: false,
        }}
        toggleItemSelection={toggleItemSelection}
        updateItemQuantity={updateItemQuantity}
        updateItemReason={updateItemReason}
        updateItemDisposition={updateItemDisposition}
    />);

    await fireEvent.press(screen.getByText("+"));
    await fireEvent.press(screen.getByText("WRONG ITEM"));
    expect(updateItemQuantity).toHaveBeenCalledWith(15, 1);
    expect(updateItemReason).toHaveBeenCalledWith(15, "WRONG_ITEM");
});
