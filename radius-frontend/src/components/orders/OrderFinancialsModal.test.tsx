import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { OnlineOrder } from "@/types/order.types";
import { OrderFinancialsModal } from "./OrderFinancialsModal";

const order: OnlineOrder = {
    order_id: 12,
    store_id: 1,
    customer_name: "Customer",
    customer_email: "customer@example.com",
    order_type: "SHIPPING",
    status: "PROCESSING",
    total_amount: 18.75,
    placed_at: "2026-10-11T00:00:00Z",
    fulfilled_at: null,
    shipping_address: "12 Main Street",
    carrier: "",
    tracking_number: "",
    estimated_delivery_date: "",
    actual_delivery_date: "",
    subtotal: 15,
    tax_amount: 1.25,
    shipping_fee: 2.5,
    discount_total: 0,
    promo_code: "",
    cost_total: 0,
};

describe("OrderFinancialsModal", () => {
    it("shows shipping fallbacks and formatted totals", async () => {
        await render(<OrderFinancialsModal order={order} visible onClose={jest.fn()} />);
        expect(screen.getByText("12 Main Street")).toBeTruthy();
        expect(screen.getByText("Standard")).toBeTruthy();
        expect(screen.getByText("N/A")).toBeTruthy();
        expect(screen.getByText("$18.75")).toBeTruthy();
    });

    it("hides shipping details when the order has no shipping address and closes", async () => {
        const onClose = jest.fn();
        await render(<OrderFinancialsModal order={{ ...order, shipping_address: "" }} visible onClose={onClose} />);
        expect(screen.queryByText("Shipping")).toBeNull();
        fireEvent.press(screen.getByLabelText("Close order breakdown"));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
