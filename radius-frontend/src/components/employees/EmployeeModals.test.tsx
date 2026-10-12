import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { EmployeeFormModal } from "./EmployeeModals";
import { Employee } from "@/types/admin.types";
import { saveEmployee } from "@/api/employees.api";
import { showToast } from "@/utils/helpers";

jest.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ logout: jest.fn() }) }));
jest.mock("@/api/employees.api", () => ({
    saveEmployee: jest.fn(async () => ({})),
    activateEmployee: jest.fn(),
    terminateEmployee: jest.fn(),
}));
jest.mock("@/utils/helpers", () => ({
    capitalize: (value: string) => value,
    showToast: jest.fn(),
}));

const employee: Employee = {
    employee_id: 42,
    store_id: 7,
    first_name: "Jane",
    last_name: "Doe",
    email: "jane@example.com",
    role: "MANAGER",
    phone: "4165550100",
    address: "123 Main St",
    city: "Toronto",
    province: "Ontario",
    postal_code: "M5V 2T6",
    is_active: true,
    is_terminated: false,
};

it("saves an edited employee without a password field", async () => {
    const onSuccess = jest.fn();
    await render(<EmployeeFormModal
        visible
        mode="edit"
        employee={employee}
        onBack={jest.fn()}
        onSuccess={onSuccess}
    />);

    await fireEvent.changeText(screen.getByPlaceholderText("First Name"), "Janet");
    await fireEvent.press(screen.getByText("Save"));

    expect(showToast).not.toHaveBeenCalledWith("error", expect.any(String));

    await waitFor(() => expect(saveEmployee).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ first_name: "Janet", store_id: 7, postal_code: "M5V2T6" }),
        expect.any(Function),
    ));
    expect(jest.mocked(saveEmployee).mock.calls[0][1]).not.toHaveProperty("password");
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ first_name: "Janet" }));
});
