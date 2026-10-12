import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { OnlineOrderItem } from "@/types/order.types";
import { OrderItemActionModal } from "./OrderItemActionModal";

const item: OnlineOrderItem = {
    order_item_id: 5,
    order_id: 12,
    product_id: 9,
    product_sku: "SKU-9",
    quantity: 3,
    unit_price: 10,
    picked_qty: 1,
    status: "ACTIVE",
};

it("passes the selected cancellation reason to the order action", async () => {
    const submit = jest.fn(async () => {});

    function Harness() {
        const [selectedItemForAction, setSelectedItemForAction] = useState<OnlineOrderItem | null>(item);
        const [itemActionType, setItemActionType] = useState<"MENU" | "CANCEL" | "REMOVE" | "INVALID_QTY" | null>("MENU");
        const [selectedItemReason, setSelectedItemReason] = useState("");
        const [tempInvalidQty, setTempInvalidQty] = useState(0);
        return <OrderItemActionModal
            selectedItemForAction={selectedItemForAction}
            setSelectedItemForAction={setSelectedItemForAction}
            itemActionType={itemActionType}
            setItemActionType={setItemActionType}
            selectedItemReason={selectedItemReason}
            setSelectedItemReason={setSelectedItemReason}
            tempInvalidQty={tempInvalidQty}
            setTempInvalidQty={setTempInvalidQty}
            isSaving={false}
            handleItemExceptionSubmit={submit}
        />;
    }

    await render(<Harness />);
    await fireEvent.press(screen.getByText("Cancel Item"));
    await fireEvent.press(screen.getByText("Damaged / Defective"));
    await fireEvent.press(screen.getByText("Confirm"));
    expect(submit).toHaveBeenCalledWith("CANCELLED", "Damaged / Defective", 0);
});
