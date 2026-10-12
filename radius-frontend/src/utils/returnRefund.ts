import { SelectedReturnItem } from "@/components/returns/ReturnSaleItemCard";
import { LookupTransactionResponse, OriginalTransactionItemForReturn } from "@/types/returns.types";
import { type Money, prorateMoney, sumMoney } from "@/utils/money";

export const RETURN_APPROVAL_THRESHOLD: Money = 50;

export function receiptRefundTax(tx: LookupTransactionResponse, refundSubtotal: Money): Money {
    const taxRefundedSoFar = prorateMoney(tx.tax_amount, tx.refunded_subtotal, tx.subtotal);
    const taxThroughThisReturn = prorateMoney(tx.tax_amount, sumMoney([tx.refunded_subtotal, refundSubtotal]), tx.subtotal);
    const taxRemaining = sumMoney([tx.tax_amount, -tx.refunded_tax]);
    return Math.min(Math.max(sumMoney([taxThroughThisReturn, -taxRefundedSoFar]), 0), taxRemaining);
}

// Mirrors the backend: each unit's share of the discounted line total is allocated cumulatively,
// so partial returns round per unit while a full return refunds exactly what the line cost.
export function lineRefundAmount(item: Pick<SelectedReturnItem, "line_net_total" | "purchased_qty" | "already_returned_qty">, quantity: number): Money {
    const through = item.already_returned_qty + quantity;
    return sumMoney([
        prorateMoney(item.line_net_total, through, item.purchased_qty),
        -prorateMoney(item.line_net_total, item.already_returned_qty, item.purchased_qty),
    ]);
}

export function refundSubtotal(items: SelectedReturnItem[]): Money {
    return sumMoney(items.map((item) => lineRefundAmount(item, item.quantity)));
}

export function selectionFromItem(item: OriginalTransactionItemForReturn): SelectedReturnItem {
    return {
        original_transaction_item_id: item.transaction_item_id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        unit_price: item.unit_price,
        line_net_total: item.net_line_total,
        purchased_qty: item.purchased_qty,
        already_returned_qty: item.returned_qty,
        quantity: 1,
        max_returnable: item.returnable_qty,
        return_reason: "DEFECTIVE",
        disposition: "DEFECTIVE_RTV",
        is_outside_policy: item.is_outside_policy_window,
    };
}
