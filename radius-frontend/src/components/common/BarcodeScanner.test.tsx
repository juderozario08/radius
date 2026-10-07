import React from "react";
import { render, screen } from "@testing-library/react-native";
import { BarcodeScanner } from "./BarcodeScanner";
import { useCameraPermission } from "@/hooks/useBarcode";

let mockCameraScan: ((result: { type: string; data: string }) => void) | undefined;
jest.mock("expo-camera", () => ({ CameraView: ({ onBarcodeScanned }: { onBarcodeScanned: typeof mockCameraScan }) => {
    mockCameraScan = onBarcodeScanned;
    return null;
} }));
jest.mock("@react-navigation/native", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useBarcode", () => ({ useCameraPermission: jest.fn() }));

beforeEach(() => {
    mockCameraScan = undefined;
    (useCameraPermission as jest.Mock).mockReturnValue(true);
});

it("sanitizes scans and suppresses immediate duplicates", async () => {
    const onBarcodeScanned = jest.fn();
    await render(<BarcodeScanner onBarcodeScanned={onBarcodeScanned} />);
    expect(mockCameraScan).toBeDefined();
    mockCameraScan!({ type: "code128", data: "\u200B 12345 \n" });
    mockCameraScan!({ type: "code128", data: "12345" });
    mockCameraScan!({ type: "code128", data: "<bad>" });
    expect(onBarcodeScanned).toHaveBeenCalledTimes(1);
    expect(onBarcodeScanned).toHaveBeenCalledWith("12345");
});

it("does not render an active camera without permission", async () => {
    (useCameraPermission as jest.Mock).mockReturnValue(false);
    await render(<BarcodeScanner onBarcodeScanned={jest.fn()} />);
    expect(screen.getByText("No access to camera")).toBeTruthy();
    expect(mockCameraScan).toBeUndefined();
});
