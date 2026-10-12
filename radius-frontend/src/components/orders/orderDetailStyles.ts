import { StyleSheet } from "react-native";
import { COLORS } from "@/constants/colors";
import { SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";

export const orderDetailStyles = StyleSheet.create({
    headerMenuBtn: {
        padding: SPACING.xsm,
    },
    customerInfoCard: {
        backgroundColor: COLORS.surface,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    customerHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    customerName: {
        fontSize: FONT_SIZE.xl,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginBottom: SPACING.xxs,
    },
    customerContact: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textSecondary,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.smd,
        marginTop: SPACING.sm,
    },
    metaBadge: {
        fontSize: FONT_SIZE.sm,
        fontWeight: "700",
        color: COLORS.accent,
        backgroundColor: COLORS.accentSurface,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xxs,
        borderRadius: RADIUS.sm,
    },
    metaText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
    },
    statusBadge: {
        paddingHorizontal: SPACING.smd,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.lg,
    },
    statusText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: "700",
    },
    warningBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.sm,
        backgroundColor: COLORS.inactiveBg,
        borderWidth: 1,
        borderColor: COLORS.dangerBorderLight,
        borderRadius: RADIUS.md,
        marginHorizontal: SPACING.lg,
        marginTop: SPACING.md,
        padding: SPACING.smd,
    },
    warningBannerText: {
        flex: 1,
        fontSize: FONT_SIZE.smd,
        color: COLORS.dangerDark,
        fontWeight: "600",
    },
    cancellationBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xsm,
        marginTop: SPACING.sm,
        backgroundColor: COLORS.inactiveBg,
        padding: SPACING.xsm,
        borderRadius: RADIUS.sm,
    },
    cancellationText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.primary,
        fontWeight: "600",
    },

    tabContainer: {
        flexDirection: "row",
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: SPACING.md,
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    tabActive: {
        borderBottomColor: COLORS.primary,
    },
    tabText: {
        fontSize: FONT_SIZE.mdl,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    tabTextActive: {
        color: COLORS.primary,
    },

    bannerContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.sm,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.smd,
    },
    bannerError: {
        backgroundColor: COLORS.inactiveBg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.dangerBorderLight,
    },
    bannerSuccess: {
        backgroundColor: COLORS.activeBg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.successBorderLight,
    },
    bannerText: {
        fontSize: FONT_SIZE.md,
        fontWeight: "600",
    },
    bannerTextError: {
        color: COLORS.primary,
    },
    bannerTextSuccess: {
        color: COLORS.success,
    },

    scannerTabContent: {
        flex: 1,
    },
    manualEntrySection: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.smd,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    manualEntryLabel: {
        fontSize: FONT_SIZE.sm,
        fontWeight: "600",
        color: COLORS.textSecondary,
        marginBottom: SPACING.xsm,
    },
    manualInputRow: {
        flexDirection: "row",
        gap: SPACING.sm,
    },
    manualInput: {
        flex: 1,
        height: 44,
        paddingVertical: 0,
    },
    manualAddBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.lg,
        borderRadius: RADIUS.md,
        justifyContent: "center",
        alignItems: "center",
    },
    manualAddBtnText: {
        color: COLORS.surface,
        fontWeight: "700",
        fontSize: FONT_SIZE.md,
    },

    scannedCardPopup: {
        margin: SPACING.lg,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.primary,
        elevation: 4,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    scannedCardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: SPACING.md,
    },
    scannedCardTitle: {
        fontSize: FONT_SIZE.lg,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    scannedCardSub: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textSecondary,
        marginTop: SPACING.xxs,
    },
    stepperSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: SPACING.xs,
        paddingVertical: SPACING.xsm,
    },
    stepperLabel: {
        fontSize: FONT_SIZE.mdl,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    stepperControls: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.neutralBg,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    stepperBtn: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
    },
    stepperValue: {
        fontSize: FONT_SIZE.lg,
        fontWeight: "700",
        color: COLORS.textPrimary,
        minWidth: 32,
        textAlign: "center",
    },

    emptyScannerArea: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: SPACING.xxl,
    },
    emptyScannerText: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        textAlign: "center",
        marginTop: SPACING.md,
        lineHeight: 20,
    },

    productsList: {
        padding: SPACING.lg,
        gap: SPACING.md,
        paddingBottom: 90,
    },
    productCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.mdl,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 1,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    productCardDimmed: {
        opacity: 0.6,
        backgroundColor: COLORS.surfaceMuted,
    },
    productCardComplete: {
        borderColor: COLORS.successBorderLight,
    },
    productCardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    productSku: {
        fontSize: FONT_SIZE.mdl,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    productPrice: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textSecondary,
        marginTop: SPACING.xxs,
    },
    itemStatusBadge: {
        paddingHorizontal: SPACING.xsm,
        paddingVertical: SPACING.xxs,
        borderRadius: RADIUS.xs,
    },
    itemStatusText: {
        fontSize: FONT_SIZE.xxs,
        fontWeight: "700",
    },
    itemActionBtn: {
        padding: SPACING.xs,
    },
    progressRow: {
        marginTop: SPACING.md,
    },
    progressLabel: {
        fontSize: FONT_SIZE.smd,
        fontWeight: "600",
        color: COLORS.textPrimary,
        marginBottom: SPACING.xsm,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: COLORS.inputBorder,
        borderRadius: 3,
        overflow: "hidden",
    },
    progressBarFill: {
        height: 6,
        borderRadius: 3,
    },
    itemReasonRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xs,
        marginTop: SPACING.sm,
    },
    itemReasonText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        fontStyle: "italic",
    },

    bottomBarContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        elevation: 8,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    confirmButton: {
        height: 50,
        borderRadius: RADIUS.md,
        justifyContent: "center",
        alignItems: "center",
    },
    confirmButtonActive: {
        backgroundColor: COLORS.primary,
    },
    confirmButtonDisabled: {
        backgroundColor: COLORS.inputBorder,
    },
    confirmButtonText: {
        fontSize: FONT_SIZE.lg,
        fontWeight: "700",
    },
    confirmButtonTextActive: {
        color: COLORS.surface,
    },
    confirmButtonTextDisabled: {
        color: COLORS.inactiveTint,
    },

    modalBody: {
        padding: SPACING.xl,
    },
    modalTitle: {
        fontSize: FONT_SIZE.xl,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    modalSubtitle: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textSecondary,
        marginTop: SPACING.xxs,
        marginBottom: SPACING.md,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    menuItemText: {
        fontSize: FONT_SIZE.mdl,
        fontWeight: "600",
        color: COLORS.textPrimary,
        marginLeft: SPACING.sm,
    },
    menuItemSubText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        marginTop: SPACING.xxs,
    },
    radioRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: SPACING.smd,
        paddingHorizontal: SPACING.sm,
        borderRadius: RADIUS.sm,
        marginVertical: SPACING.xxs,
    },
    radioRowSelected: {
        backgroundColor: COLORS.inactiveBg,
    },
    radioLabel: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textPrimary,
        marginLeft: SPACING.smd,
    },
    radioLabelSelected: {
        fontWeight: "600",
        color: COLORS.primary,
    },
    modalBtnRow: {
        flexDirection: "row",
        gap: SPACING.md,
        marginTop: SPACING.lg,
    },
    assigneeRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: SPACING.smd,
        paddingTop: SPACING.smd,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    assigneeInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xsm,
        flex: 1,
    },
    assigneeText: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textSecondary,
    },
    reassignBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xs,
        paddingVertical: SPACING.xsPlus,
        paddingHorizontal: SPACING.smd,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.violetBg,
    },
    reassignBtnText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: "700",
        color: COLORS.primary,
    },

});
