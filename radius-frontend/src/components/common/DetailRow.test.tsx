import React from "react";
import { render, screen } from "@testing-library/react-native";
import { DetailRow } from "./DetailRow";

describe("DetailRow", () => {
    it.each(["inline", "row", "stacked"] as const)("renders the %s layout", async (layout) => {
        await render(<DetailRow label="Store" value={7} layout={layout} />);
        expect(screen.getByText("Store")).toBeTruthy();
        expect(screen.getByText("7")).toBeTruthy();
    });
});
