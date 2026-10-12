import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { CycleCountItemDetail } from "@/types/cyclecount.types";
import { CycleCountItemCard } from "./CycleCountItemCard";

const item = {
    product_name: "Widget",
    sku: "SKU-8",
    upc: "123",
    expected_qty: 5,
    counted_qty: 3,
    variance: -2,
} as CycleCountItemDetail;

it("shows the shortage and opens an editable item", async () => {
    const onEdit = jest.fn();
    await render(<CycleCountItemCard item={item} canEdit onEdit={onEdit} />);
    expect(screen.getByText("-2 short")).toBeTruthy();
    await fireEvent.press(screen.getByText("Widget"));
    expect(onEdit).toHaveBeenCalledWith(item);
});

it("does not open an approved count item", async () => {
    const onEdit = jest.fn();
    await render(<CycleCountItemCard item={item} canEdit={false} onEdit={onEdit} />);
    await fireEvent.press(screen.getByText("Widget"));
    expect(onEdit).not.toHaveBeenCalled();
});
