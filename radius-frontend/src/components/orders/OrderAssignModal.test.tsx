import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { assignOnlineOrder } from "@/api/onlineOrders.api";
import { getAssignableEmployees } from "@/api/employees.api";
import { OnlineOrder } from "@/types/order.types";
import { OrderAssignModal } from "./OrderAssignModal";

jest.mock("@/api/onlineOrders.api", () => ({
    assignOnlineOrder: jest.fn(),
}));
jest.mock("@/api/employees.api", () => ({ getAssignableEmployees: jest.fn() }));

const order: OnlineOrder = {
    order_id: 12,
    store_id: 1,
    customer_name: "Customer",
    customer_email: "customer@example.com",
    order_type: "SHIPPING",
    status: "PROCESSING",
    total_amount: 0,
    placed_at: "2026-10-11T00:00:00Z",
    fulfilled_at: null,
    shipping_address: "",
    carrier: "",
    tracking_number: "",
    estimated_delivery_date: "",
    actual_delivery_date: "",
    subtotal: 0,
    tax_amount: 0,
    shipping_fee: 0,
    discount_total: 0,
    promo_code: "",
    cost_total: 0,
};

const associate = {
    employee_id: 7,
    store_id: 1,
    first_name: "Sam",
    last_name: "Lee",
    email: "sam@example.com",
    role: "SALES",
    phone: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
    is_active: true,
    is_terminated: false,
};

it("filters ineligible employees and assigns the selected associate", async () => {
    const logout = jest.fn(async () => {});
    const onAssigned = jest.fn();
    const onClose = jest.fn();
    (getAssignableEmployees as jest.Mock).mockResolvedValue({ employees: [associate, { ...associate, employee_id: 8, first_name: "Terminated", is_terminated: true }] });
    (assignOnlineOrder as jest.Mock).mockResolvedValue({ assigned_to_name: "Sam Lee" });

    await render(<OrderAssignModal visible order={order} role="MANAGER" logout={logout} onClose={onClose} onAssigned={onAssigned} />);
    expect(await screen.findByText("Sam Lee")).toBeTruthy();
    expect(screen.queryByText("Terminated Lee")).toBeNull();
    await fireEvent.press(screen.getByText("Sam Lee"));
    await fireEvent.press(screen.getByText("Assign"));

    await waitFor(() => expect(onAssigned).toHaveBeenCalledWith(7, "Sam Lee"));
    expect(assignOnlineOrder).toHaveBeenCalledWith(12, 7, logout);
    expect(onClose).toHaveBeenCalledTimes(1);
});
