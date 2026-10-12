import { Href } from "expo-router";
import { CycleCountSummary } from "@/types/cyclecount.types";
import { OnlineOrder } from "@/types/order.types";
import { PurchaseOrderSummary } from "@/types/receiving.types";
import {
    CycleCountUpdatedPayload,
    OrderCreatedPayload,
    OrderStatusUpdatedPayload,
    StoreActivityPayload,
} from "@/types/websocket.types";
import { isHiddenDashboardActivity } from "@/utils/dashboardActivities";

const ORDER_DETAIL = "/(app)/(tabs)/home/actions/sales_floor/Orders/[id]";

export function isDashboardEligibleOrder(order: { order_type?: string; status?: string }): boolean {
    const type = (order.order_type || "").toUpperCase();
    const status = (order.status || "").toUpperCase();

    if (type === "STS") {
        return ["SHIPPED", "DELIVERING", "DELIVERED"].includes(status);
    }
    if (type === "BOPIS") {
        return ["WORK IN PROGRESS", "PENDING", "PLACED"].includes(status);
    }
    return false;
}

export function isInProgressCount(status?: string): boolean {
    const s = (status || "").toUpperCase();
    return s === "IN PROGRESS" || s === "IN_PROGRESS";
}

export function orderToPayload(order: OnlineOrder): OrderCreatedPayload {
    return {
        order_id: order.order_id,
        store_id: order.store_id,
        customer_name: order.customer_name || "Customer",
        customer_email: order.customer_email || "",
        order_type: order.order_type || "BOPIS",
        status: order.status || "PENDING",
        total_amount: Number(order.total_amount) || 0,
        items_count: 1,
        placed_at: order.placed_at || new Date().toISOString(),
        assigned_to: order.assigned_to,
        assigned_to_name: order.assigned_to_name,
    };
}

export function countToPayload(count: CycleCountSummary): CycleCountUpdatedPayload {
    return {
        count_id: count.count_id,
        store_id: count.store_id,
        category_id: count.category_id,
        category_name: count.category_name,
        status: "IN PROGRESS",
        action: "scanned",
        total_items: count.total_items,
        counted_items: count.counted_items,
        total_variance_cost: Number(count.total_variance_cost) || 0,
        updated_at: count.count_date || new Date().toISOString(),
        counted_by: count.counted_by,
        counted_by_name: count.counted_by_name,
    };
}

export function applyOrderStatusUpdate(orders: OrderCreatedPayload[], payload: OrderStatusUpdatedPayload): OrderCreatedPayload[] {
    const eligible = isDashboardEligibleOrder({ order_type: payload.order_type, status: payload.new_status });
    if (!eligible) {
        return orders.filter((o) => o.order_id !== payload.order_id);
    }
    if (orders.some((o) => o.order_id === payload.order_id)) {
        return orders.map((o) =>
            o.order_id === payload.order_id
                ? {
                    ...o,
                    status: payload.new_status,
                    assigned_to: payload.assigned_to !== undefined ? payload.assigned_to : o.assigned_to,
                    assigned_to_name: payload.assigned_to_name !== undefined ? payload.assigned_to_name : o.assigned_to_name,
                }
                : o
        );
    }
    return [
        {
            order_id: payload.order_id,
            store_id: payload.store_id,
            customer_name: payload.customer_name || "Customer",
            customer_email: "",
            order_type: payload.order_type,
            status: payload.new_status,
            total_amount: payload.total_amount || 0,
            items_count: 1,
            placed_at: new Date().toISOString(),
            assigned_to: payload.assigned_to,
            assigned_to_name: payload.assigned_to_name,
        },
        ...orders,
    ];
}

export function applyCycleCountUpdate(counts: CycleCountUpdatedPayload[], payload: CycleCountUpdatedPayload): CycleCountUpdatedPayload[] {
    if (!isInProgressCount(payload.status)) {
        return counts.filter((c) => c.count_id !== payload.count_id);
    }
    const index = counts.findIndex((c) => c.count_id === payload.count_id);
    if (index >= 0) {
        const updated = [...counts];
        updated[index] = payload;
        return updated;
    }
    return [payload, ...counts];
}

export function orderCreatedActivity(payload: OrderCreatedPayload, now = Date.now()): StoreActivityPayload {
    return {
        activity_id: `act-order-${payload.order_id}-${now}`,
        store_id: payload.store_id,
        activity_type: "ORDER_PLACED",
        title: `New Online Order #${payload.order_id}`,
        description: `${payload.customer_name} placed ${payload.order_type} order with ${payload.items_count} item(s)`,
        timestamp: payload.placed_at || new Date(now).toISOString(),
        metadata: {
            order_id: payload.order_id,
            order_type: payload.order_type,
            assigned_to: payload.assigned_to,
        },
    };
}

export function orderStatusActivity(payload: OrderStatusUpdatedPayload, now = Date.now()): StoreActivityPayload {
    return {
        activity_id: `act-status-${payload.order_id}-${now}`,
        store_id: payload.store_id,
        activity_type: "ORDER_STATUS_CHANGED",
        title: `Order #${payload.order_id} Updated`,
        description: payload.assigned_to_name
            ? `Assigned to ${payload.assigned_to_name} (${payload.new_status})`
            : `Moved from ${payload.previous_status} to ${payload.new_status}`,
        timestamp: payload.updated_at || new Date(now).toISOString(),
        metadata: {
            order_id: payload.order_id,
            assigned_to: payload.assigned_to,
            assigned_to_name: payload.assigned_to_name,
        },
    };
}

export function cycleCountActivity(payload: CycleCountUpdatedPayload, now = Date.now()): StoreActivityPayload {
    return {
        activity_id: `act-cycle-${payload.count_id}-${now}`,
        store_id: payload.store_id,
        activity_type: "CYCLE_COUNT_UPDATED",
        title: `Cycle Count #${payload.count_id} - ${payload.category_name}`,
        description: `Action: ${payload.action} | Progress: ${payload.counted_items}/${payload.total_items} items`,
        timestamp: payload.updated_at || new Date(now).toISOString(),
        metadata: { count_id: payload.count_id, counted_by: payload.counted_by },
    };
}

export function isLiveStoreActivity(payload: StoreActivityPayload): boolean {
    return !isHiddenDashboardActivity(payload.activity_type);
}

interface SnapshotSources {
    orders?: OnlineOrder[];
    cancelledOrders?: OnlineOrder[];
    counts?: CycleCountSummary[];
    purchaseOrders?: PurchaseOrderSummary[];
}

export function buildSnapshotActivities({ orders = [], cancelledOrders = [], counts = [], purchaseOrders = [] }: SnapshotSources): StoreActivityPayload[] {
    const now = new Date().toISOString();
    const activities: StoreActivityPayload[] = [];

    for (const o of orders.filter(isDashboardEligibleOrder)) {
        if (o.order_type === "BOPIS") {
            activities.push({
                activity_id: `act-bopis-${o.order_id}`,
                store_id: o.store_id,
                activity_type: "ORDER_PLACED",
                title: `BOPIS Order #${o.order_id}`,
                description: `${o.customer_name} placed order (${o.status}) • ${o.assigned_to_name ? `Assigned to ${o.assigned_to_name}` : "Unassigned"}`,
                timestamp: o.placed_at || now,
                metadata: { order_id: o.order_id, order_type: o.order_type, assigned_to: o.assigned_to, assigned_to_name: o.assigned_to_name },
            });
        } else if (o.order_type === "STS") {
            activities.push({
                activity_id: `act-sts-${o.order_id}`,
                store_id: o.store_id,
                activity_type: "ORDER_STATUS_CHANGED",
                title: `STS Order #${o.order_id} In Transit`,
                description: `Ship-to-Store package (${o.status}) for ${o.customer_name}`,
                timestamp: o.placed_at || now,
                metadata: { order_id: o.order_id, order_type: o.order_type },
            });
        }
    }

    for (const o of cancelledOrders) {
        activities.push({
            activity_id: `act-cancel-${o.order_id}`,
            store_id: o.store_id,
            activity_type: "ORDER_TIMEOUT",
            title: `BOPIS Order #${o.order_id} Timed Out`,
            description: `Pickup expired • Auto-cancelled for ${o.customer_name}`,
            timestamp: o.fulfilled_at || o.placed_at || now,
            metadata: { order_id: o.order_id, order_type: o.order_type },
        });
    }

    for (const c of counts.filter((count) => isInProgressCount(count.status))) {
        activities.push({
            activity_id: `act-cycle-${c.count_id}`,
            store_id: c.store_id,
            activity_type: "CYCLE_COUNT_UPDATED",
            title: `Cycle Count #${c.count_id} - ${c.category_name}`,
            description: `Progress: ${c.counted_items}/${c.total_items} items counted${c.counted_by_name ? ` by ${c.counted_by_name}` : ""}`,
            timestamp: c.count_date || now,
            metadata: { count_id: c.count_id, counted_by: c.counted_by },
        });
    }

    for (const po of purchaseOrders.filter((p) => p.status !== "RECEIVED" && p.status !== "CANCELLED")) {
        activities.push({
            activity_id: `act-po-${po.po_id}`,
            store_id: po.store_id,
            activity_type: "RECEIVING_DOCK",
            title: `PO #${po.po_id} (${po.supplier_name})`,
            description: `${po.item_count} item(s) • Status: ${po.status}${po.has_lprs ? " (LPR Pallet)" : ""}`,
            timestamp: po.arrived_at || po.expected_at || po.ordered_at || now,
            metadata: { po_id: po.po_id },
        });
    }

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const seen = new Set<string>();
    return activities.filter((a) => {
        if (seen.has(a.activity_id)) return false;
        seen.add(a.activity_id);
        return true;
    });
}

function idFromTitle(title: string, pattern: RegExp): number | null {
    const match = title.match(pattern);
    return match ? Number(match[1]) : null;
}

export function orderDetailRoute(orderId: number): Href {
    return { pathname: ORDER_DETAIL, params: { id: orderId, from: "dashboard" } };
}

export function activityRoute(activity: StoreActivityPayload): Href {
    const meta = activity.metadata;
    const type = activity.activity_type;
    const orderId = meta?.order_id || idFromTitle(activity.title, /#(\d+)/);
    const countId = meta?.count_id || idFromTitle(activity.title, /Count #(\d+)/);
    const poId = meta?.po_id || idFromTitle(activity.title, /PO #(\d+)/);

    if (type.includes("ORDER") && orderId) {
        return orderDetailRoute(orderId);
    }
    if (type.includes("CYCLE") && countId) {
        return { pathname: "/(app)/(tabs)/home/actions/back_room/CycleCountDetail", params: { id: String(countId), from: "dashboard" } };
    }
    if (type.includes("POS") || type.includes("TRANSACTION")) {
        return { pathname: "/(app)/(tabs)/home/actions/sales_floor/Transactions", params: { from: "dashboard" } };
    }
    if (type.includes("RECEIVING") || type.includes("PO")) {
        return poId
            ? { pathname: "/(app)/(tabs)/home/actions/back_room/ReceivePO", params: { po_id: String(poId), from: "dashboard" } }
            : { pathname: "/(app)/(tabs)/home/actions/back_room/Receiving", params: { from: "dashboard" } };
    }
    if (type.includes("IS4TC") || type.includes("FILL")) {
        return { pathname: "/(app)/(tabs)/home/actions/sales_floor/IS4TC", params: { from: "dashboard" } };
    }
    return "/(app)/(tabs)/home/actions";
}
