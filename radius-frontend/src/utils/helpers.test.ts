import { apiFetch, apiFetchSWR, clearSWRCache, UnauthorizedError } from "@/api/client";
import Toast from "react-native-toast-message";
import { callApi, capitalize } from "./helpers";

jest.mock("@/api/client", () => ({
    apiFetch: jest.fn(),
    apiFetchSWR: jest.fn(),
    clearSWRCache: jest.fn(),
    UnauthorizedError: class UnauthorizedError extends Error {},
}));
jest.mock("react-native-toast-message", () => ({ show: jest.fn() }));

const logout = jest.fn().mockResolvedValue(undefined);

beforeEach(() => jest.clearAllMocks());

describe("callApi", () => {
    it("uses SWR for GET and returns the response", async () => {
        (apiFetchSWR as jest.Mock).mockResolvedValue({ value: 4 });
        await expect(callApi("/inventory", { swr: true }, logout)).resolves.toEqual({ value: 4 });
        expect(apiFetchSWR).toHaveBeenCalledWith("/inventory", expect.objectContaining({ method: "GET" }));
        expect(apiFetch).not.toHaveBeenCalled();
    });

    it("serializes mutations and invalidates related caches", async () => {
        (apiFetch as jest.Mock).mockResolvedValue({ ok: true });
        await callApi("/transfers/1", { method: "POST", body: { qty: 2 } }, logout);
        expect(apiFetch).toHaveBeenCalledWith("/transfers/1", expect.objectContaining({ body: '{"qty":2}' }));
        expect(clearSWRCache).toHaveBeenCalledWith("/transfers");
        expect(clearSWRCache).toHaveBeenCalledWith("/receiving");
        expect(clearSWRCache).toHaveBeenCalledWith("/inventory");
    });

    it("logs out after unauthorized responses", async () => {
        (apiFetch as jest.Mock).mockRejectedValue(new UnauthorizedError("expired"));
        await expect(callApi("/inventory", {}, logout)).resolves.toBeNull();
        expect(logout).toHaveBeenCalledTimes(1);
        expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({ type: "error" }));
    });

    it("does not toast or log out for cancellation", async () => {
        const controller = new AbortController();
        controller.abort();
        (apiFetch as jest.Mock).mockRejectedValue(new Error("cancelled"));
        await expect(callApi("/inventory", { signal: controller.signal }, logout)).resolves.toBeNull();
        expect(Toast.show).not.toHaveBeenCalled();
        expect(logout).not.toHaveBeenCalled();
    });
});

it("capitalizes labels", () => {
    expect(capitalize("sALES")).toBe("Sales");
    expect(capitalize("")).toBe("");
});
