import { CycleCountSummary } from "@/types/cyclecount.types";
import { OnlineOrder } from "@/types/order.types";
import { PurchaseOrderSummary } from "@/types/receiving.types";
import { CycleCountUpdatedPayload, OrderCreatedPayload, OrderStatusUpdatedPayload, StoreActivityPayload } from "@/types/websocket.types";
import {
    activityRoute,
    applyCycleCountUpdate,
    applyOrderStatusUpdate,
    buildSnapshotActivities,
    isDashboardEligibleOrder,
    isLiveStoreActivity,
} from "./dashboardFeed";

const order = (id: number, overrides: Partial<OrderCreatedPayload> = {}): OrderCreatedPayload => ({
    order_id: id,
    store_id: 2,
    customer_name: "Ada",
    customer_email: "",
    order_type: "BOPIS",
    status: "PENDING",
    total_amount: 10,
    items_count: 1,
    placed_at: "2026-10-11T00:00:00Z",
    ...overrides,
});

const statusUpdate = (id: number, newStatus: string, overrides: Partial<OrderStatusUpdatedPayload> = {}): OrderStatusUpdatedPayload => ({
    order_id: id,
    store_id: 2,
    customer_name: "Ada",
    order_type: "BOPIS",
    previous_status: "PENDING",
    new_status: newStatus,
    total_amount: 10,
    updated_at: "2026-10-11T01:00:00Z",
    ...overrides,
});

const count = (id: number, status: string): CycleCountUpdatedPayload => ({
    count_id: id,
    store_id: 2,
    category_id: 1,
    category_name: "Paper",
    status,
    action: "scanned",
    total_items: 10,
    counted_items: 3,
    total_variance_cost: 0,
    updated_at: "2026-10-11T00:00:00Z",
});

const activity = (type: string, title: string, metadata: StoreActivityPayload["metadata"] = {}): StoreActivityPayload => ({
    activity_id: title,
    store_id: 2,
    activity_type: type,
    title,
    description: "",
    timestamp: "2026-10-11T00:00:00Z",
    metadata,
});

it("treats only actionable BOPIS and arrived STS orders as dashboard orders", () => {
    expect(isDashboardEligibleOrder({ order_type: "BOPIS", status: "work in progress" })).toBe(true);
    expect(isDashboardEligibleOrder({ order_type: "STS", status: "DELIVERED" })).toBe(true);
    expect(isDashboardEligibleOrder({ order_type: "BOPIS", status: "CANCELLED" })).toBe(false);
    expect(isDashboardEligibleOrder({ order_type: "SHIP", status: "PENDING" })).toBe(false);
});

it("updates, adds and removes orders from status events", () => {
    const orders = [order(1), order(2)];
    const assigned = applyOrderStatusUpdate(orders, statusUpdate(1, "WORK IN PROGRESS", { assigned_to: 9, assigned_to_name: "Sam" }));
    expect(assigned[0]).toMatchObject({ order_id: 1, status: "WORK IN PROGRESS", assigned_to: 9, assigned_to_name: "Sam" });
    expect(applyOrderStatusUpdate(orders, statusUpdate(2, "READY FOR PICKUP")).map((o) => o.order_id)).toEqual([1]);
    expect(applyOrderStatusUpdate(orders, statusUpdate(3, "PENDING")).map((o) => o.order_id)).toEqual([3, 1, 2]);
});

it("keeps only in-progress cycle counts from count events", () => {
    const counts = [count(1, "IN PROGRESS"), count(2, "IN PROGRESS")];
    expect(applyCycleCountUpdate(counts, count(2, "PENDING APPROVAL")).map((c) => c.count_id)).toEqual([1]);
    expect(applyCycleCountUpdate(counts, count(3, "IN_PROGRESS")).map((c) => c.count_id)).toEqual([3, 1, 2]);
    expect(applyCycleCountUpdate(counts, { ...count(1, "IN PROGRESS"), counted_items: 9 })[0].counted_items).toBe(9);
});

it("hides register and stock activities from the live feed", () => {
    expect(isLiveStoreActivity(activity("POS_SALE", "Sale"))).toBe(false);
    expect(isLiveStoreActivity(activity("CUSTOMER_RETURN_COMPLETED", "Return"))).toBe(true);
});

it("builds a sorted, de-duplicated snapshot from every dashboard source", () => {
    const orders = [
        { order_id: 1, store_id: 2, customer_name: "Ada", order_type: "BOPIS", status: "PENDING", placed_at: "2026-10-11T03:00:00Z" },
        { order_id: 2, store_id: 2, customer_name: "Bo", order_type: "BOPIS", status: "CANCELLED", placed_at: "2026-10-11T04:00:00Z" },
    ] as OnlineOrder[];
    const counts = [
        { count_id: 5, store_id: 2, category_name: "Ink", status: "IN PROGRESS", counted_items: 1, total_items: 4, count_date: "2026-10-11T02:00:00Z" },
        { count_id: 6, store_id: 2, category_name: "Desks", status: "APPROVED", counted_items: 4, total_items: 4, count_date: "2026-10-11T05:00:00Z" },
    ] as CycleCountSummary[];
    const purchaseOrders = [
        { po_id: 8, store_id: 2, supplier_name: "Acme", status: "SHIPPED", item_count: 3, has_lprs: true, ordered_at: "2026-10-11T01:00:00Z", expected_at: null, arrived_at: null },
        { po_id: 9, store_id: 2, supplier_name: "Acme", status: "RECEIVED", item_count: 3, has_lprs: false, ordered_at: "2026-10-11T06:00:00Z", expected_at: null, arrived_at: null },
    ] as PurchaseOrderSummary[];

    const result = buildSnapshotActivities({ orders: [...orders, orders[0]], counts, purchaseOrders });
    expect(result.map((a) => a.activity_id)).toEqual(["act-bopis-1", "act-cycle-5", "act-po-8"]);
    expect(result[2].description).toContain("(LPR Pallet)");
});

it("routes activities to the screen that handles them", () => {
    expect(activityRoute(activity("ORDER_PLACED", "Order #12", { order_id: 12 }))).toEqual({
        pathname: "/(app)/(tabs)/home/actions/sales_floor/Orders/[id]",
        params: { id: 12, from: "dashboard" },
    });
    expect(activityRoute(activity("CYCLE_COUNT_UPDATED", "Cycle Count #4 - Ink"))).toEqual({
        pathname: "/(app)/(tabs)/home/actions/back_room/CycleCountDetail",
        params: { id: "4", from: "dashboard" },
    });
    expect(activityRoute(activity("RECEIVING_DOCK", "PO #8 (Acme)", { po_id: 8 }))).toEqual({
        pathname: "/(app)/(tabs)/home/actions/back_room/ReceivePO",
        params: { po_id: "8", from: "dashboard" },
    });
    expect(activityRoute(activity("SOMETHING_ELSE", "Note"))).toBe("/(app)/(tabs)/home/actions");
});
