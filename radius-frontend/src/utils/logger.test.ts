import { logger } from "./logger";

describe("logger.warn", () => {
    const originalDev = __DEV__;
    let warnSpy: jest.SpyInstance;

    beforeEach(() => {
        warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        (global as any).__DEV__ = originalDev;
        warnSpy.mockRestore();
    });

    it("logs in development", () => {
        (global as any).__DEV__ = true;
        const err = new Error("boom");
        logger.warn("Socket error:", err);

        expect(warnSpy).toHaveBeenCalledWith("Socket error:", err);
    });

    it("is silent outside development", () => {
        (global as any).__DEV__ = false;
        logger.warn("Socket error:", new Error("boom"));

        expect(warnSpy).not.toHaveBeenCalled();
    });
});
