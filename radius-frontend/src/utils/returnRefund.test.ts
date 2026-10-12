import { OriginalTransactionItemForReturn, LookupTransactionResponse } from "@/types/returns.types";
import { lineRefundAmount, receiptRefundTax, refundSubtotal, selectionFromItem } from "./returnRefund";

const headset: OriginalTransactionItemForReturn = {
    transaction_item_id: 2001,
    product_id: 301,
    product_sku: "SKU-301",
    product_name: "Headset",
    brand: "Acme",
    purchased_qty: 3,
    returned_qty: 0,
    returnable_qty: 3,
    unit_price: 9.66,
    net_line_total: 29,
    unit_cost: 5,
    is_returnable: true,
    return_window_days: 30,
    is_outside_policy_window: false,
};

it("refunds a discounted line exactly like the server", () => {
    const selection = selectionFromItem(headset);
    expect(lineRefundAmount(selection, 3)).toBe(29);
    expect(lineRefundAmount(selection, 1)).toBe(9.67);
    expect(lineRefundAmount({ ...selection, already_returned_qty: 1 }, 2)).toBe(19.33);
});

it("sums selected lines using their net totals", () => {
    const first = { ...selectionFromItem(headset), quantity: 3 };
    const second = { ...selectionFromItem({ ...headset, transaction_item_id: 2002, purchased_qty: 1, net_line_total: 12.5, unit_price: 12.5 }), quantity: 1 };
    expect(refundSubtotal([first, second])).toBe(41.5);
});

it("refunds receipt tax proportionally and never more than what remains", () => {
    const tx = { subtotal: 103.09, tax_amount: 13.4, refunded_subtotal: 0, refunded_tax: 0 } as LookupTransactionResponse;
    expect(receiptRefundTax(tx, 1.03)).toBe(0.13);
    expect(receiptRefundTax(tx, 103.09)).toBe(13.4);
    expect(receiptRefundTax({ ...tx, refunded_subtotal: 102.06, refunded_tax: 13.4 }, 1.03)).toBe(0);
});
