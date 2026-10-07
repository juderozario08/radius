import { apiFetch, ConflictError, UnauthorizedError } from "./client";
import { getToken, getRefreshToken, saveToken, saveRefreshToken } from "@/utils/token";

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

    it("rejects when a refreshed token is also unauthorized", async () => {
        global.fetch = jest.fn()
            .mockResolvedValueOnce(mockResponse(401))
            .mockResolvedValueOnce(mockResponse(200, { token: "new-access", refresh_token: "new-refresh" }))
            .mockResolvedValueOnce(mockResponse(401));
        await expect(apiFetch("/test", { cachePolicy: "no-store" })).rejects.toBeInstanceOf(UnauthorizedError);
    });
});
