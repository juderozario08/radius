import { StyleSheet } from "react-native";
import { COLORS } from "@/constants/colors";
import { SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";

export const employeeScreenStyles = StyleSheet.create({
    listWrapper: {
        flex: 1,
        paddingBottom: 0,
    },
    addIcon: {
        width: 25,
        height: 25
    },
    name: {
        fontSize: FONT_SIZE.xl,
        fontWeight: "700",
        color: COLORS.textPrimary
    },
    detailsContainer: {
        gap: SPACING.xsm
    },
    formHeader: {
        padding: SPACING.xl,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.surfaceMuted
    },
    formHeaderEdit: {
        borderBottomColor: COLORS.accent,
        backgroundColor: COLORS.accentBg
    },
    formContainer: {
        padding: SPACING.xl
    },
    inputLabel: {
        fontSize: FONT_SIZE.md,
        fontWeight: "600",
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
        marginTop: SPACING.md
    },
    input: {
        backgroundColor: COLORS.inputBg,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.mdl,
        paddingVertical: SPACING.md,
        fontSize: FONT_SIZE.mdl,
        marginBottom: SPACING.md,
        color: COLORS.textPrimary,
    },
    inputRow: {
        flexDirection: "row",
        justifyContent: "space-between"
    },
    inputHalf: {
        flex: 1,
        marginRight: SPACING.sm
    },
    rolesContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: SPACING.sm,
        marginBottom: SPACING.md
    },
    rolePill: {
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.lg,
        borderRadius: RADIUS.xxl,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
    },
    rolePillActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary
    },
    rolePillText: {
        fontSize: FONT_SIZE.smd,
        fontWeight: "600",
        color: COLORS.textSecondary
    },
    rolePillTextActive: {
        color: COLORS.surface
    },
});
