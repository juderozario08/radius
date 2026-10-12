import { CycleCountUpdatedPayload, StoreActivityPayload } from "@/types/websocket.types";
import { filterDashboardActivities, filterDashboardCycleCounts, mergeDashboardActivities } from "./dashboardActivities";

const count = (countedBy: number | null): CycleCountUpdatedPayload => ({
    count_id: countedBy || 1,
    store_id: 1,
    category_id: 1,
    category_name: "Paint",
    status: "IN PROGRESS",
    action: "scanned",
    total_items: 10,
    counted_items: 2,
    total_variance_cost: 0,
    updated_at: "2026-10-11T00:00:00Z",
    counted_by: countedBy,
});

const activity = (id: string, type: string, storeId = 1, metadata: StoreActivityPayload["metadata"] = {}): StoreActivityPayload => ({
    activity_id: id,
    store_id: storeId,
    activity_type: type,
    title: id,
    description: id,
    timestamp: "2026-10-11T00:00:00Z",
    metadata,
});

it("shows only the current employee's cycle counts and cycle activities in my tasks", () => {
    expect(filterDashboardCycleCounts([count(7), count(8), count(null)], true, 7)).toEqual([count(7)]);
    const activities = [
        activity("mine", "CYCLE_COUNT_UPDATED", 1, { counted_by: 7 }),
        activity("other", "CYCLE_COUNT_UPDATED", 1, { counted_by: 8 }),
        activity("unassigned", "CYCLE_COUNT_UPDATED", 1, { counted_by: null }),
    ];
    expect(filterDashboardActivities(activities, true, 7).map((item) => item.activity_id)).toEqual(["mine"]);
});

it("keeps WebSocket-only entries on reload for the selected store", () => {
    const snapshot = [activity("snapshot-new", "ORDER_PLACED")];
    const previous = [
        activity("live", "STORE_ACTIVITY"),
        activity("old-snapshot", "ORDER_PLACED"),
        activity("other-store", "STORE_ACTIVITY", 2),
    ];
    const result = mergeDashboardActivities(snapshot, previous, new Set(["live", "other-store"]), 1);
    expect(result.map((item) => item.activity_id)).toEqual(["live", "snapshot-new"]);
});
