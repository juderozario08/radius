export type TransactionType = "SALE" | "RETURN" | "VOID";
export type TransactionPaymentMethod = "CASH" | "CARD" | "GIFT CARD";
export type TransactionStatus = "VOIDED" | "COMPLETED" | "REFUNDED";

export interface Transaction {
    transaction_id: number;
    store_id: number;
    register_id: string;
    employee_id: number | null;
    transaction_type: TransactionType;
    subtotal: number;
    tax_amount: number;
    discount_total: number;
    cost_total: number;
    total_amount: number;
    payment_method: TransactionPaymentMethod | null;
    card_type?: string;
    card_number?: string;
    status: TransactionStatus;
    preferred_member_id: number | null;
    payment_reference: string | null;
    created_at: string;
}

export interface TransactionItem {
    transaction_item_id: number;
    transaction_id: number;
    product_id: number;
    product_sku?: string | null;
    product_name?: string | null;
    quantity: number;
    unit_price: number;
    unit_cost: number;
    discount_amount: number;
    return_reason: string | null;
    scanned_barcode: string | null;
}

export interface GetAllTransactionsResponse {
    transactions: Transaction[];
    total_length: number;
}

export interface GetTransactionByIDResponse {
    transaction: Transaction;
    items: TransactionItem[];
}
