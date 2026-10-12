import { CycleCountUpdatedPayload, StoreActivityPayload } from "@/types/websocket.types";

const HIDDEN_ACTIVITY_TYPES = ["POS", "TRANSACTION", "CHECKOUT", "FILL", "STOCK"];

export function isHiddenDashboardActivity(activityType: string): boolean {
    return HIDDEN_ACTIVITY_TYPES.some((type) => activityType.includes(type));
}

export function filterDashboardCycleCounts(counts: CycleCountUpdatedPayload[], myTasks: boolean, employeeId?: number) {
    const inProgress = counts.filter((count) => ["IN PROGRESS", "IN_PROGRESS"].includes((count.status || "").toUpperCase()));
    return myTasks ? inProgress.filter((count) => employeeId !== undefined && count.counted_by === employeeId) : inProgress;
}

export function filterDashboardActivities(activities: StoreActivityPayload[], myTasks: boolean, employeeId?: number) {
    const filtered = activities.filter((activity) => !isHiddenDashboardActivity(activity.activity_type));
    const scoped = myTasks ? filtered.filter((activity) => {
        if (employeeId === undefined) return false;
        if (activity.activity_type === "CYCLE_COUNT_UPDATED") return activity.metadata?.counted_by === employeeId;
        return activity.metadata?.employee_id === employeeId || activity.metadata?.assigned_to === employeeId || !activity.metadata?.assigned_to;
    }) : filtered;
    const seen = new Set<string>();
    return scoped.filter((activity) => {
        if (seen.has(activity.activity_id)) return false;
        seen.add(activity.activity_id);
        return true;
    });
}

export function mergeDashboardActivities(snapshot: StoreActivityPayload[], previous: StoreActivityPayload[], websocketIds: Set<string>, storeId?: number) {
    const live = previous.filter((activity) => websocketIds.has(activity.activity_id) && (!storeId || activity.store_id === storeId));
    const seen = new Set<string>();
    return [...live, ...snapshot]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .filter((activity) => {
            if (seen.has(activity.activity_id)) return false;
            seen.add(activity.activity_id);
            return true;
        })
        .slice(0, 100);
}
