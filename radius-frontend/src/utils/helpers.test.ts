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

    it("returns data from a plain GET without touching caches", async () => {
        (apiFetch as jest.Mock).mockResolvedValue({ value: 1 });
        await expect(callApi("/inventory", undefined, logout)).resolves.toEqual({ value: 1 });
        expect(apiFetchSWR).not.toHaveBeenCalled();
        expect(clearSWRCache).not.toHaveBeenCalled();
        expect(Toast.show).not.toHaveBeenCalled();
    });

    it.each([
        ["an HTTP error", new Error("Insufficient stock")],
        ["a network failure", new TypeError("Network request failed")],
        ["a timeout", Object.assign(new Error("Request timed out. Check your connection and try again."), { name: "TimeoutError" })],
    ])("toasts the message and returns null for %s", async (_, error) => {
        (apiFetch as jest.Mock).mockRejectedValue(error);
        await expect(callApi("/transfers/1", { method: "POST" }, logout)).resolves.toBeNull();
        expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({ type: "error", text1: error.message }));
        expect(logout).not.toHaveBeenCalled();
        expect(clearSWRCache).not.toHaveBeenCalled();
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

    it("stays silent when a shared request was aborted by another caller", async () => {
        (apiFetch as jest.Mock).mockRejectedValue(Object.assign(new Error("Aborted"), { name: "AbortError" }));
        await expect(callApi("/inventory", {}, logout)).resolves.toBeNull();
        expect(Toast.show).not.toHaveBeenCalled();
    });
});

it("capitalizes labels", () => {
    expect(capitalize("sALES")).toBe("Sales");
    expect(capitalize("")).toBe("");
});
