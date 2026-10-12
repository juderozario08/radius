import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { BrandPickerModal } from "./BrandPickerModal";

it("filters brands and selects the matching result", async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    await render(<BrandPickerModal visible brands={["Acme", "Beacon", "Cobalt"]} onSelect={onSelect} onClose={onClose} />);

    await fireEvent.changeText(screen.getByLabelText("Search brands"), "bea");
    expect(screen.getByText("Beacon")).toBeTruthy();
    expect(screen.queryByText("Acme")).toBeNull();
    await fireEvent.press(screen.getByText("Beacon"));
    expect(onSelect).toHaveBeenCalledWith("Beacon");
    expect(onClose).toHaveBeenCalledTimes(1);
});
