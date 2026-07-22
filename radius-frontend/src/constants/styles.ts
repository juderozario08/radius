//radius-frontend/src/constants/styles.ts
import { StyleSheet } from "react-native";
import { COLORS } from "./colors";

export const globalStyles = StyleSheet.create({
    // --- Layouts ---
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    centerElement: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    listContainer: {
        padding: 16,
        gap: 12,
    },
    paddingHorizontal: {
        paddingHorizontal: 10,
    },

    // --- Typography ---
    headerTitle: {
        fontWeight: "bold",
        fontSize: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#9E9E9E",
        textTransform: "uppercase",
        marginBottom: 4,
    },
    pageTitle: {
        fontSize: 25,
        fontWeight: "bold",
        marginLeft: 15,
        marginTop: 15,
    },
    errorText: {
        color: COLORS.primary,
        textAlign: "center",
        marginTop: 40,
        fontSize: 16,
    },
    emptyText: {
        color: COLORS.textSecondary,
        textAlign: "center",
        justifyContent: "center",
        alignItems: "center",
        fontSize: 16,
    },

    // --- Shared Modal Wrappers ---
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContentWrapper: {
        width: "100%",
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        overflow: "hidden",
    },
    modalCardContainer: {
        padding: 20,
        width: "100%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 16,
    },
    modalName: {
        fontSize: 22,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    modalRole: {
        fontSize: 16,
        fontWeight: "500",
        color: COLORS.textSecondary,
        textTransform: "capitalize",
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 12,
    },
    section: {
        gap: 8,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    safeAreaContainer: {
        flex: 1,
        backgroundColor: COLORS.headerBackground,
    },
    headerImageSize: {
        width: 25,
        height: 25,
    }
});
