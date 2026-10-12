import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { CycleCountItemDetail } from "@/types/cyclecount.types";
import { EditCountItemModal } from "./CycleCountDetailModals";

it("keeps the edited count at zero and lets the user save it", async () => {
    const save = jest.fn(async () => {});
    const item = { product_name: "Widget", expected_qty: 3 } as CycleCountItemDetail;

    function Harness() {
        const [editingItem, setEditingItem] = useState<CycleCountItemDetail | null>(item);
        const [editQty, setEditQty] = useState(0);
        const [editReason, setEditReason] = useState("");
        return <EditCountItemModal
            editingItem={editingItem}
            setEditingItem={setEditingItem}
            editQty={editQty}
            setEditQty={setEditQty}
            editReason={editReason}
            setEditReason={setEditReason}
            isActionLoading={false}
            handleSaveItemQty={save}
        />;
    }

    await render(<Harness />);
    await fireEvent.press(screen.getByLabelText("Decrease counted quantity"));
    expect(screen.getByText("0")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Increase counted quantity"));
    expect(screen.getByText("1")).toBeTruthy();
    await fireEvent.press(screen.getByText("Save Count"));
    expect(save).toHaveBeenCalledTimes(1);
});
