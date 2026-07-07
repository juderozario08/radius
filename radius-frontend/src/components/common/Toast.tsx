import Toast, { BaseToast, ErrorToast, ToastProps } from "react-native-toast-message";

const config = {
    success: (props: ToastProps) => (
        <BaseToast
            {...props}
            style={{
                backgroundColor: "#16A34A",
                borderWidth: 2,
                borderLeftWidth: 2,
                borderColor: "#4ADE80",
                borderLeftColor: "#4ADE80",
                borderRadius: 10,
            }}
            text1Style={{ color: "#F0FDF4", fontSize: 16, fontWeight: "600" }}
        />
    ),
    error: (props: ToastProps) => (
        <ErrorToast
            {...props}
            style={{
                backgroundColor: "#DC2626",
                borderWidth: 2,
                borderLeftWidth: 2,
                borderColor: "#F87171",
                borderLeftColor: "#F87171",
                borderRadius: 10,
            }}
            text1Style={{ color: "#FEF2F2", fontSize: 16, fontWeight: "600" }}
        />
    ),
    info: (props: ToastProps) => (
        <BaseToast
            {...props}
            style={{
                backgroundColor: "#2563EB",
                borderLeftWidth: 2,
                borderWidth: 2,
                borderColor: "#60A5FA",
                borderLeftColor: "#60A5FA",
                borderRadius: 10,
            }}
            text1Style={{ color: "#EFF6FF", fontSize: 16, fontWeight: "600" }}
        />
    ),
    warning: (props: ToastProps) => (
        <BaseToast
            {...props}
            style={{
                backgroundColor: "#D97706",
                borderLeftWidth: 2,
                borderWidth: 2,
                borderColor: "#FBBF24",
                borderLeftColor: "#FBBF24",
                borderRadius: 10,
            }}
            text1Style={{ color: "#FFFBEB", fontSize: 16, fontWeight: "600" }}
        />
    ),
};

export default function CustomToast() {
    return (
        <Toast config={config} />
    )
}
