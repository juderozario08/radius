import React from "react";
import { act, render, waitFor } from "@testing-library/react-native";
import Toast from "react-native-toast-message";
import { callApi } from "@/utils/helpers";
import IS4TCScanScreen from "../app/(app)/(tabs)/home/actions/sales_floor/IS4TC";

const mockScanner = { resetScanner: jest.fn(), triggerSuccess: jest.fn(), triggerError: jest.fn() };
let mockScan: ((barcode: string) => void) | undefined;

jest.mock("@/components/common/BarcodeScanner", () => {
    const { forwardRef, useImperativeHandle } = jest.requireActual("react");
    return {
        BarcodeScanner: forwardRef(({ onBarcodeScanned }: { onBarcodeScanned: (barcode: string) => void }, ref: unknown) => {
            mockScan = onBarcodeScanned;
            useImperativeHandle(ref, () => mockScanner);
            return null;
        }),
    };
});
jest.mock("@/utils/helpers", () => ({ callApi: jest.fn() }));
jest.mock("@/hooks/useAuth", () => {
    const auth = { logout: jest.fn(), user: { store_id: 3 } };
    return { useAuth: () => auth };
});
jest.mock("@/components/common/BackButton", () => () => null);
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("react-native-toast-message", () => ({ show: jest.fn() }));

function mockLookup(result: unknown) {
    (callApi as jest.Mock).mockImplementation(async (endpoint: string) =>
        endpoint.includes("barcode=") ? result : { status: "ok", items: [] }
    );
}

async function scan(barcode: string) {
    await render(<IS4TCScanScreen />);
    await waitFor(() => expect(mockScan).toBeDefined());
    await act(async () => mockScan!(barcode));
}

beforeEach(() => {
    jest.clearAllMocks();
    mockScan = undefined;
});

it("shows Not Found when the lookup succeeds without a product", async () => {
    mockLookup({ product: null, message: "No product found for this barcode" });
    await scan("12345");
    expect(mockScanner.triggerError).toHaveBeenCalled();
    expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({ text1: "Not Found" }));
});

it("adds nothing on top of callApi's toast when the lookup fails", async () => {
    mockLookup(null);
    await scan("12345");
    expect(mockScanner.triggerError).toHaveBeenCalled();
    expect(Toast.show).not.toHaveBeenCalled();
});
