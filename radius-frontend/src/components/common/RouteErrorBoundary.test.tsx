import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { GENERIC_ERROR_MESSAGE, RouteErrorBoundary } from "./RouteErrorBoundary";

describe("RouteErrorBoundary", () => {
    const originalDev = __DEV__;

    afterEach(() => {
        (global as any).__DEV__ = originalDev;
    });

    it("shows the error message in development and retries on press", async () => {
        (global as any).__DEV__ = true;
        const retry = jest.fn(() => Promise.resolve());
        await render(<RouteErrorBoundary error={new Error("boom")} retry={retry} />);

        expect(screen.getByText("boom")).toBeTruthy();
        fireEvent.press(screen.getByText("Try again"));
        expect(retry).toHaveBeenCalledTimes(1);
    });

    it("shows a generic message outside development", async () => {
        (global as any).__DEV__ = false;
        await render(<RouteErrorBoundary error={new Error("boom")} retry={jest.fn(() => Promise.resolve())} />);

        expect(screen.getByText(GENERIC_ERROR_MESSAGE)).toBeTruthy();
        expect(screen.queryByText("boom")).toBeNull();
    });
});
