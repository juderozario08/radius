import { ENDPOINTS } from "@/constants/routes";
import { FillReportFilter, FillReportResponse } from "@/types/report.types";
import { callApi } from "@/utils/helpers";

export async function getFillReport(logout: () => Promise<void>, filter?: FillReportFilter): Promise<FillReportResponse | null> {
    const params = new URLSearchParams();

    if (filter?.query) {
        params.append("query", filter.query);
    }
    if (filter?.filter_type) {
        params.append("filter_type", filter.filter_type);
    }
    if (filter?.sort_by) {
        params.append("sort_by", filter.sort_by);
    }
    if (filter?.sort_order) {
        params.append("sort_order", filter.sort_order);
    }
    if (filter?.store_id) {
        params.append("store_id", filter.store_id.toString());
    }

    const queryString = params.toString();
    const path = queryString
        ? `${ENDPOINTS.SALES_FLOOR.FILL_REPORT.get}?${queryString}`
        : ENDPOINTS.SALES_FLOOR.FILL_REPORT.get;

    return callApi<FillReportResponse>(path, { method: "GET" }, logout);
}
