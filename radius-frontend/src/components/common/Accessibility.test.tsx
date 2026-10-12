import React from "react";
import { render, screen } from "@testing-library/react-native";
import BackButton from "./BackButton";
import { Button } from "./Button";
import NotificationIconComponent from "./NotificationIcon";
import LogoutComponent from "./Logout";
import PillGroup from "./PillGroup";
import { ActionButtonRow } from "./ActionButtonRow";
import Dropdown from "./Dropdown";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";

jest.mock("expo-router", () => ({
    router: { navigate: jest.fn(), back: jest.fn(), canGoBack: () => true },
    useLocalSearchParams: () => ({}),
    usePathname: () => "/test",
}));

jest.mock("@/hooks/useNotification", () => ({
    useNotifications: () => ({ getNotifications: jest.fn() }),
}));

jest.mock("@/hooks/useAuth", () => ({
    useAuth: () => ({ logout: jest.fn() }),
}));

jest.mock("@/utils/helpers", () => ({
    showToast: jest.fn(),
}));

describe("Shared Components Accessibility", () => {
    it("renders BackButton with button role and accessible label", async () => {
        await render(<BackButton />);
        const button = screen.getByRole("button", { name: "Go back" });
        expect(button).toBeTruthy();
    });

    it("renders Button with button role, accessible label, and disabled state", async () => {
        await render(<Button title="Submit" disabled />);
        const button = screen.getByRole("button", { name: "Submit" });
        expect(button).toBeTruthy();
        expect(button.props.accessibilityState).toEqual({ disabled: true });
    });

    it("renders NotificationIcon with button role and accessible label", async () => {
        await render(<NotificationIconComponent />);
        expect(screen.getByRole("button", { name: "Notifications" })).toBeTruthy();
    });

    it("renders Logout with button role and accessible label", async () => {
        await render(<LogoutComponent />);
        expect(screen.getByRole("button", { name: "Log out" })).toBeTruthy();
    });

    it("renders PillGroup options with button roles, labels, and selected state", async () => {
        const options = [
            { label: "Active", value: "active" },
            { label: "Archived", value: "archived" },
        ];
        await render(<PillGroup options={options} value="active" onChange={jest.fn()} />);
        const activeOption = screen.getByRole("button", { name: "Active" });
        const archivedOption = screen.getByRole("button", { name: "Archived" });
        expect(activeOption.props.accessibilityState).toEqual({ selected: true });
        expect(archivedOption.props.accessibilityState).toEqual({ selected: false });
    });

    it("renders ActionButtonRow with button role, loading, and disabled state", async () => {
        const buttons = [
            { key: "save", label: "Save", kind: "primary" as const, onPress: jest.fn() },
            { key: "del", label: "Delete", kind: "danger" as const, onPress: jest.fn(), disabled: true, loading: true },
        ];
        await render(<ActionButtonRow buttons={buttons} />);
        const saveBtn = screen.getByRole("button", { name: "Save" });
        const delBtn = screen.getByRole("button", { name: "Delete" });
        expect(saveBtn.props.accessibilityState).toEqual({ disabled: false, busy: false });
        expect(delBtn.props.accessibilityState).toEqual({ disabled: true, busy: true });
    });

    it("renders Dropdown trigger with combobox role and accessible label", async () => {
        const options = [{ label: "Option 1", value: 1 }];
        await render(<Dropdown options={options} value={1} onSelect={jest.fn()} title="Items" />);
        const trigger = screen.getByRole("combobox", { name: "Items" });
        expect(trigger).toBeTruthy();
        expect(trigger.props.accessibilityState).toEqual({ expanded: false, disabled: false });
    });

    it("renders ConnectionStatusBadge with button role when offline and pressable", async () => {
        await render(<ConnectionStatusBadge status="disconnected" onPress={jest.fn()} />);
        expect(screen.getByRole("button", { name: "Offline connection status, tap to reconnect" })).toBeTruthy();
    });
});
