import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { ScannedOrderItemCard } from "./ScannedOrderItemCard";
import { OnlineOrderItem } from "@/types/order.types";

const item: OnlineOrderItem = {
    order_item_id: 1,
    order_id: 2,
    product_id: 3,
    product_sku: "SKU-3",
    quantity: 2,
    unit_price: 10,
    picked_qty: 0,
};

it("keeps picked quantity within zero and ordered quantity", async () => {
    const onQtyChange = jest.fn();
    const view = await render(<ScannedOrderItemCard item={item} pickedQty={0} isSaving={false} onQtyChange={onQtyChange} onDismiss={jest.fn()} onSave={jest.fn()} />);

    await fireEvent.press(screen.getByLabelText("Decrease picked quantity"));
    expect(onQtyChange).toHaveBeenLastCalledWith(0);

    await view.rerender(<ScannedOrderItemCard item={item} pickedQty={2} isSaving={false} onQtyChange={onQtyChange} onDismiss={jest.fn()} onSave={jest.fn()} />);
    await fireEvent.press(screen.getByLabelText("Increase picked quantity"));
    expect(onQtyChange).toHaveBeenLastCalledWith(2);
});
