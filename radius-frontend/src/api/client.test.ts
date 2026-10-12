import { apiFetch, ConflictError, TimeoutError, UnauthorizedError } from "./client";
import { getToken, getRefreshToken, saveToken, saveRefreshToken, deleteToken, deleteRefreshToken } from "@/utils/token";
import { ENDPOINTS } from "@/constants/routes";

jest.mock("@/utils/token", () => ({
    getToken: jest.fn(),
    saveToken: jest.fn(),
    getRefreshToken: jest.fn(),
    saveRefreshToken: jest.fn(),
    deleteToken: jest.fn(),
    deleteRefreshToken: jest.fn(),
}));

const mockResponse = (status: number, body: unknown = {}, etag?: string) => ({
    status,
    ok: status >= 200 && status < 300,
    json: jest.fn().mockResolvedValue(body),
    headers: { get: jest.fn((key: string) => key.toLowerCase() === "etag" ? etag ?? null : null) },
}) as unknown as Response;

describe("apiFetch", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getToken as jest.Mock).mockResolvedValue("old-access");
        (getRefreshToken as jest.Mock).mockResolvedValue("old-refresh");
    });

    it("rotates and persists tokens before retrying a 401", async () => {
        const fetchMock = jest.fn()
            .mockResolvedValueOnce(mockResponse(401))
            .mockResolvedValueOnce(mockResponse(200, { token: "new-access", refresh_token: "new-refresh" }))
            .mockResolvedValueOnce(mockResponse(200, { value: 7 }));
        global.fetch = fetchMock;

        await expect(apiFetch<{ value: number }>("/test", { cachePolicy: "no-store" })).resolves.toEqual({ value: 7 });
        expect(saveToken).toHaveBeenCalledWith("new-access");
        expect(saveRefreshToken).toHaveBeenCalledWith("new-refresh");
        expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe("Bearer new-access");
    });

    it("preserves conflict messages from the API", async () => {
        global.fetch = jest.fn().mockResolvedValue(mockResponse(409, { error: "Invalid or stale status transition" }));
        await expect(apiFetch("/test", { cachePolicy: "no-store" })).rejects.toThrow(new ConflictError("Invalid or stale status transition"));
    });

    it("returns cached data for a 304", async () => {
        global.fetch = jest.fn()
            .mockResolvedValueOnce(mockResponse(200, { value: 1 }, "version-one"))
            .mockResolvedValueOnce(mockResponse(304));
        await expect(apiFetch("/etag-test", { cachePolicy: "network-first" })).resolves.toEqual({ value: 1 });
        await expect(apiFetch("/etag-test", { cachePolicy: "network-first" })).resolves.toEqual({ value: 1 });
    });

    describe("timeouts", () => {
        const hangingFetch = () => jest.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("Aborted"), { name: "AbortError" })));
        }));

        beforeEach(() => jest.useFakeTimers());
        afterEach(() => jest.useRealTimers());

        it("rejects with a TimeoutError after 15 seconds", async () => {
            global.fetch = hangingFetch() as unknown as typeof fetch;
            const result = apiFetch("/slow", { cachePolicy: "no-store" });
            const assertion = expect(result).rejects.toBeInstanceOf(TimeoutError);
            await jest.advanceTimersByTimeAsync(15000);
            await assertion;
        });

        it("keeps the AbortError when the caller cancels", async () => {
            global.fetch = hangingFetch() as unknown as typeof fetch;
            const controller = new AbortController();
            const result = apiFetch("/slow", { cachePolicy: "no-store", signal: controller.signal });
            const assertion = expect(result).rejects.toMatchObject({ name: "AbortError" });
            await jest.advanceTimersByTimeAsync(0);
            controller.abort();
            await assertion;
        });

        it("rejects with a TimeoutError when reading response body times out", async () => {
            global.fetch = jest.fn((_url: string, init: RequestInit) => Promise.resolve({
                status: 200,
                ok: true,
                headers: { get: () => null },
                json: () => new Promise((_resolve, reject) => {
                    init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("Aborted"), { name: "AbortError" })));
                }),
            })) as unknown as typeof fetch;

            const result = apiFetch("/slow-body", { cachePolicy: "no-store" });
            const assertion = expect(result).rejects.toBeInstanceOf(TimeoutError);
            await jest.advanceTimersByTimeAsync(15000);
            await assertion;
        });
    });

    describe("deduplication with AbortSignal", () => {
        it("does not abort other callers when one caller cancels", async () => {
            let resolveFetch: (res: Response) => void;
            global.fetch = jest.fn(() => new Promise<Response>((resolve) => {
                resolveFetch = resolve;
            })) as unknown as typeof fetch;

            const controller1 = new AbortController();
            const caller1 = apiFetch<{ name: string }>("/shared", { signal: controller1.signal });
            const caller2 = apiFetch<{ name: string }>("/shared");

            controller1.abort();

            await expect(caller1).rejects.toMatchObject({ name: "AbortError" });

            resolveFetch!(mockResponse(200, { name: "item" }));
            await expect(caller2).resolves.toEqual({ name: "item" });
        });

        it("aborts underlying fetch when all subscribed callers cancel", async () => {
            let aborted = false;
            global.fetch = jest.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
                init.signal?.addEventListener("abort", () => {
                    aborted = true;
                    reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
                });
            })) as unknown as typeof fetch;

            const controller1 = new AbortController();
            const controller2 = new AbortController();
            const caller1 = apiFetch("/shared-all", { signal: controller1.signal });
            const caller2 = apiFetch("/shared-all", { signal: controller2.signal });

            controller1.abort();
            await expect(caller1).rejects.toMatchObject({ name: "AbortError" });
            expect(aborted).toBe(false);

            controller2.abort();
            await expect(caller2).rejects.toMatchObject({ name: "AbortError" });
            expect(aborted).toBe(true);
        });
    });

    it("rejects when a refreshed token is also unauthorized", async () => {
        global.fetch = jest.fn()
            .mockResolvedValueOnce(mockResponse(401))
            .mockResolvedValueOnce(mockResponse(200, { token: "new-access", refresh_token: "new-refresh" }))
            .mockResolvedValueOnce(mockResponse(401));
        await expect(apiFetch("/test", { cachePolicy: "no-store" })).rejects.toBeInstanceOf(UnauthorizedError);
    });

    describe("token refresh", () => {
        const isRefresh = (url: string) => url.endsWith(ENDPOINTS.AUTH.refreshToken);
        const refreshCalls = (fetchMock: jest.Mock) => fetchMock.mock.calls.filter(([url]) => isRefresh(url));

        beforeEach(() => {
            let stored = "old-access";
            (getToken as jest.Mock).mockImplementation(async () => stored);
            (saveToken as jest.Mock).mockImplementation(async (token: string) => { stored = token; });
        });

        it("shares one refresh between concurrent 401s and retries each with the new token", async () => {
            const fetchMock = jest.fn(async (url: string, init: RequestInit) => {
                if (isRefresh(url)) {
                    await Promise.resolve();
                    return mockResponse(200, { token: "new-access", refresh_token: "new-refresh" });
                }
                const auth = (init.headers as Record<string, string>).Authorization;
                return auth === "Bearer new-access" ? mockResponse(200, { url }) : mockResponse(401);
            });
            global.fetch = fetchMock as unknown as typeof fetch;

            const results = await Promise.all(["/a", "/b", "/c"].map((path) => apiFetch(path, { cachePolicy: "no-store" })));

            expect(results).toHaveLength(3);
            expect(refreshCalls(fetchMock)).toHaveLength(1);
            expect(saveRefreshToken).toHaveBeenCalledTimes(1);
        });

        it("retries with the stored token instead of refreshing again when the rejected token was already replaced", async () => {
            const fetchMock = jest.fn().mockResolvedValueOnce(mockResponse(401)).mockResolvedValueOnce(mockResponse(200, { ok: true }));
            global.fetch = fetchMock;
            (getToken as jest.Mock).mockResolvedValueOnce("old-access").mockResolvedValue("new-access");

            await expect(apiFetch("/late", { cachePolicy: "no-store" })).resolves.toEqual({ ok: true });
            expect(refreshCalls(fetchMock)).toHaveLength(0);
            expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer new-access");
        });

        it("keeps tokens when the refresh request fails on the network", async () => {
            global.fetch = jest.fn()
                .mockResolvedValueOnce(mockResponse(401))
                .mockRejectedValueOnce(new TypeError("Network request failed"));

            await expect(apiFetch("/test", { cachePolicy: "no-store" })).rejects.toThrow(new TypeError("Network request failed"));
            expect(deleteToken).not.toHaveBeenCalled();
            expect(deleteRefreshToken).not.toHaveBeenCalled();
        });

        it("keeps tokens when the refresh endpoint fails with a server error", async () => {
            global.fetch = jest.fn()
                .mockResolvedValueOnce(mockResponse(401))
                .mockResolvedValueOnce(mockResponse(429));

            await expect(apiFetch("/test", { cachePolicy: "no-store" })).rejects.not.toBeInstanceOf(UnauthorizedError);
            expect(deleteToken).not.toHaveBeenCalled();
            expect(deleteRefreshToken).not.toHaveBeenCalled();
        });

        it("keeps tokens when the refresh request times out", async () => {
            jest.useFakeTimers();
            try {
                global.fetch = jest.fn((url: string, init: RequestInit) => isRefresh(url)
                    ? new Promise<Response>((_resolve, reject) => {
                        init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("Aborted"), { name: "AbortError" })));
                    })
                    : Promise.resolve(mockResponse(401))) as unknown as typeof fetch;

                const assertion = expect(apiFetch("/test", { cachePolicy: "no-store" })).rejects.toBeInstanceOf(TimeoutError);
                await jest.advanceTimersByTimeAsync(15000);
                await assertion;
                expect(deleteToken).not.toHaveBeenCalled();
                expect(deleteRefreshToken).not.toHaveBeenCalled();
            } finally {
                jest.useRealTimers();
            }
        });

        it("clears tokens when the refresh token is rejected", async () => {
            const fetchMock = jest.fn(async (url: string) => isRefresh(url) ? mockResponse(401, { error: "Request could not be completed" }) : mockResponse(401));
            global.fetch = fetchMock as unknown as typeof fetch;

            const results = await Promise.allSettled(["/a", "/b"].map((path) => apiFetch(path, { cachePolicy: "no-store" })));

            expect(results.every((r) => r.status === "rejected" && r.reason instanceof UnauthorizedError)).toBe(true);
            expect(refreshCalls(fetchMock)).toHaveLength(1);
            expect(deleteToken).toHaveBeenCalledTimes(1);
            expect(deleteRefreshToken).toHaveBeenCalledTimes(1);
        });
    });
});
