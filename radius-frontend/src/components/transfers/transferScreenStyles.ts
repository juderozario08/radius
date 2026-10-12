import { StyleSheet } from "react-native";
import { COLORS } from "@/constants/colors";
import { SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";

export const transferScreenStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    headerAddBtn: {
        padding: SPACING.xs,
    },
    filterSection: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.sm,
        paddingBottom: SPACING.xsm,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.smd,
        paddingVertical: SPACING.sm,
        gap: SPACING.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: FONT_SIZE.md,
        color: COLORS.textPrimary,
        padding: 0,
    },
    statusTabs: {
        flexDirection: "row",
        gap: SPACING.sm,
        paddingVertical: SPACING.smd,
    },
    statusTabPill: {
        paddingHorizontal: SPACING.mdl,
        paddingVertical: SPACING.xsm,
        borderRadius: RADIUS.xl,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    statusTabPillActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    statusTabText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    statusTabTextActive: {
        color: COLORS.surface,
    },
    listWrapper: {
        flex: 1,
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.md,
    },
    listContent: {
        paddingBottom: SPACING.xxl,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: SPACING.xxxl,
    },
    emptyTitle: {
        fontSize: FONT_SIZE.xl,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginTop: SPACING.md,
    },
    emptySubtitle: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        textAlign: "center",
        marginTop: SPACING.xsm,
    },
    detailModalContainer: {
        maxHeight: "85%",
    },
    modalLoading: {
        padding: SPACING.huge,
        alignItems: "center",
    },
    modalSubHeader: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textSecondary,
        marginTop: SPACING.xxs,
    },
    detailStatusBadge: {
        paddingHorizontal: SPACING.smd,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.lg,
    },
    detailStatusText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: "700",
        textTransform: "uppercase",
    },
    detailScroll: {
        maxHeight: 400,
    },
    itemRowCard: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    itemRowLeft: {
        flex: 1,
        marginRight: SPACING.sm,
    },
    itemRowName: {
        fontSize: FONT_SIZE.smd,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    itemRowSku: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textSecondary,
        marginTop: SPACING.xxs,
    },
    itemRowRight: {
        alignItems: "flex-end",
    },
    itemRowQtyLabel: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
    },
    itemRowQtyValue: {
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    dispatchSubtitle: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
    },
    formField: {
        marginBottom: SPACING.mdl,
    },
    createModalCard: {
        maxHeight: "90%",
    },
    createScroll: {
        maxHeight: 450,
    },
    storeListScroll: {
        flexDirection: "row",
        marginTop: SPACING.xsm,
    },
    storePill: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: SPACING.sm,
    },
    storePillSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    storePillText: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textPrimary,
        fontWeight: "500",
    },
    storePillTextSelected: {
        color: COLORS.surface,
        fontWeight: "600",
    },
    toggleRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: SPACING.smd,
        marginBottom: SPACING.mdl,
    },
    toggleTextContainer: {
        flex: 1,
    },
    toggleTitle: {
        fontSize: FONT_SIZE.smd,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    toggleSubtext: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textSecondary,
        marginTop: SPACING.xxs,
    },
    productSearchRow: {
        position: "relative",
    },
    productSearchInput: {
        paddingRight: 36,
    },
    searchSpinner: {
        position: "absolute",
        right: 12,
        top: 14,
    },
    searchResultsBox: {
        maxHeight: 180,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.surface,
        marginTop: SPACING.xs,
    },
    searchResultItem: {
        padding: SPACING.smd,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    searchResultName: {
        fontSize: FONT_SIZE.smd,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    searchResultSku: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textSecondary,
        marginTop: SPACING.xxs,
    },
    selectedProductBox: {
        marginTop: SPACING.sm,
        padding: SPACING.smd,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    selectedProductInfo: {
        marginBottom: SPACING.sm,
    },
    selectedProductName: {
        fontSize: FONT_SIZE.smd,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    selectedProductSku: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textSecondary,
        marginTop: SPACING.hairline,
    },
    qtyAddRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.sm,
    },
    qtyLabel: {
        fontSize: FONT_SIZE.smd,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    qtyInput: {
        width: 60,
        height: 36,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        borderRadius: RADIUS.sm,
        textAlign: "center",
        backgroundColor: COLORS.surface,
        fontSize: FONT_SIZE.md,
        color: COLORS.textPrimary,
    },
    addBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.sm,
    },
    addBtnText: {
        color: COLORS.surface,
        fontWeight: "600",
        fontSize: FONT_SIZE.smd,
    },
    pendingItemsSection: {
        marginTop: SPACING.smd,
    },
    pendingItemsTitle: {
        fontSize: FONT_SIZE.smd,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginBottom: SPACING.xsm,
    },
    emptyPendingText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        fontStyle: "italic",
    },
    manifestItemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    manifestItemLeft: {
        flex: 1,
        marginRight: SPACING.sm,
    },
    manifestItemName: {
        fontSize: FONT_SIZE.smd,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    manifestItemSku: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textSecondary,
        marginTop: SPACING.xxs,
    },
});
