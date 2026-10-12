import { View } from "react-native";
import Toast, { BaseToast, ErrorToast, ToastProps } from "react-native-toast-message";
import { RADIUS, FONT_SIZE } from "@/constants/styles";
import { COLORS } from "@/constants/colors";

const config = {
    success: (props: ToastProps) => (
        <BaseToast
            {...props}
            style={{
                backgroundColor: COLORS.toastSuccessBg,
                borderWidth: 2,
                borderLeftWidth: 2,
                borderColor: COLORS.toastSuccessBorder,
                borderLeftColor: COLORS.toastSuccessBorder,
                borderRadius: RADIUS.mdl,
            }}
            text1Style={{ color: COLORS.toastSuccessText, fontSize: FONT_SIZE.lg, fontWeight: "600" }}
        />
    ),
    error: (props: ToastProps) => (
        <ErrorToast
            {...props}
            style={{
                backgroundColor: COLORS.toastErrorBg,
                borderWidth: 2,
                borderLeftWidth: 2,
                borderColor: COLORS.toastErrorBorder,
                borderLeftColor: COLORS.toastErrorBorder,
                borderRadius: RADIUS.mdl,
            }}
            text1Style={{ color: COLORS.toastErrorText, fontSize: FONT_SIZE.lg, fontWeight: "600" }}
        />
    ),
    info: (props: ToastProps) => (
        <BaseToast
            {...props}
            style={{
                backgroundColor: COLORS.toastInfoBg,
                borderLeftWidth: 2,
                borderWidth: 2,
                borderColor: COLORS.toastInfoBorder,
                borderLeftColor: COLORS.toastInfoBorder,
                borderRadius: RADIUS.mdl,
            }}
            text1Style={{ color: COLORS.toastInfoText, fontSize: FONT_SIZE.lg, fontWeight: "600" }}
        />
    ),
    warning: (props: ToastProps) => (
        <BaseToast
            {...props}
            style={{
                backgroundColor: COLORS.toastWarningBg,
                borderLeftWidth: 2,
                borderWidth: 2,
                borderColor: COLORS.toastWarningBorder,
                borderLeftColor: COLORS.toastWarningBorder,
                borderRadius: RADIUS.mdl,
            }}
            text1Style={{ color: COLORS.toastWarningText, fontSize: FONT_SIZE.lg, fontWeight: "600" }}
        />
    ),
};

export default function CustomToast() {
    return (
        <View style={{ zIndex: 9999, elevation: 9999 }}>
            <Toast config={config} />
        </View>
    )
}
