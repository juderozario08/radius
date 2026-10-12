import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    TextInput,
    TouchableWithoutFeedback,
} from "react-native";
import { COLORS } from "@/constants/colors";
import Dropdown from "./Dropdown";
import { SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";

export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    isLoading?: boolean;
    pageSize?: number;
    pageSizeOptions?: number[];
    onPageSizeChange?: (size: number) => void;
}

export default function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    isLoading = false,
    pageSize,
    pageSizeOptions,
    onPageSizeChange,
}: PaginationProps) {
    const [isJumpModalVisible, setIsJumpModalVisible] = useState(false);
    const [jumpInput, setJumpInput] = useState("");

    if (totalPages <= 1 && (!pageSizeOptions || pageSizeOptions.length === 0)) return null;

    const isCompactMode = totalPages > 500;

    const getPaginationItems = (): (number | string)[] => {
        if (totalPages <= 4) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        if (currentPage <= 2) {
            return [1, 2, 3, "...", totalPages];
        }
        if (currentPage >= totalPages - 1) {
            return [1, "...", totalPages - 2, totalPages - 1, totalPages];
        }
        return [1, "...", currentPage, "...", totalPages];
    };

    const getPageFontSize = (page: number) => {
        if (page >= 1000) return 11;
        if (page >= 100) return 12;
        return 13;
    };

    const handleJumpSubmit = () => {
        const parsed = parseInt(jumpInput.replace(/[^0-9]/g, ""), 10);
        if (!isNaN(parsed)) {
            const clamped = Math.max(1, Math.min(totalPages, parsed));
            onPageChange(clamped);
            setIsJumpModalVisible(false);
        }
    };

    const paginationItems = getPaginationItems();
    const isPrevDisabled = currentPage === 1 || isLoading;
    const isNextDisabled = currentPage === totalPages || isLoading;

    const dropdownOptions = pageSizeOptions
        ? pageSizeOptions.map(size => ({ label: `${size} / page`, value: size }))
        : [];

    return (
        <View style={styles.container}>

            <View style={styles.paginationControls}>
                {totalPages > 1 && (
                    <>
                        <TouchableOpacity
                            style={[styles.pageButton, isPrevDisabled && styles.pageButtonDisabled]}
                            disabled={isPrevDisabled}
                            onPress={() => onPageChange(Math.max(1, currentPage - 1))}
                        >
                            <Text style={[styles.pageButtonText, isPrevDisabled && styles.pageButtonTextDisabled]}>Prev</Text>
                        </TouchableOpacity>

                        {isCompactMode ? (
                            <TouchableOpacity
                                style={styles.jumpTriggerButton}
                                disabled={isLoading}
                                onPress={() => {
                                    setJumpInput(String(currentPage));
                                    setIsJumpModalVisible(true);
                                }}
                            >
                                <Text style={styles.jumpTriggerText}>
                                    Page <Text style={styles.jumpTriggerHighlight}>{currentPage}</Text> of {totalPages}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.pageNumbersWrapper}>
                                {paginationItems.map((item, index) => {
                                    if (item === "...") {
                                        return (
                                            <View key={`ellipsis-${index}`} style={styles.ellipsisContainer}>
                                                <Text style={styles.ellipsisText}>...</Text>
                                            </View>
                                        );
                                    }

                                    const page = item as number;
                                    const isActive = page === currentPage;
                                    const isDisabled = isLoading || isActive;

                                    return (
                                        <TouchableOpacity
                                            key={`page-${page}`}
                                            style={[
                                                styles.pageNumberButton,
                                                isActive && styles.pageNumberButtonActive,
                                                (isLoading && !isActive) && styles.pageNumberButtonDisabled,
                                            ]}
                                            disabled={isDisabled}
                                            onPress={() => onPageChange(page)}
                                        >
                                            <Text
                                                style={[
                                                    styles.pageNumberText,
                                                    { fontSize: getPageFontSize(page) },
                                                    isActive && styles.pageNumberTextActive,
                                                    (isLoading && !isActive) && styles.pageButtonTextDisabled,
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {page}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.pageButton, isNextDisabled && styles.pageButtonDisabled]}
                            disabled={isNextDisabled}
                            onPress={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                        >
                            <Text style={[styles.pageButtonText, isNextDisabled && styles.pageButtonTextDisabled]}>Next</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {pageSizeOptions && onPageSizeChange && pageSize && (
                <Dropdown
                    options={dropdownOptions}
                    value={pageSize}
                    onSelect={onPageSizeChange}
                    title="Items per page"
                    disabled={isLoading}
                />
            )}

            <Modal
                visible={isJumpModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsJumpModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsJumpModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.jumpModalCard}>
                                <Text style={styles.jumpModalTitle}>Jump to Page</Text>
                                <Text style={styles.jumpModalSubtitle}>
                                    Enter a page between 1 and {totalPages}
                                </Text>
                                <TextInput
                                    style={styles.jumpInput}
                                    keyboardType="number-pad"
                                    value={jumpInput}
                                    onChangeText={setJumpInput}
                                    autoFocus
                                    selectTextOnFocus
                                    onSubmitEditing={handleJumpSubmit}
                                />
                                <View style={styles.jumpModalActions}>
                                    <TouchableOpacity
                                        style={styles.jumpModalCancelButton}
                                        onPress={() => setIsJumpModalVisible(false)}
                                    >
                                        <Text style={styles.jumpModalCancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.jumpModalConfirmButton}
                                        onPress={handleJumpSubmit}
                                    >
                                        <Text style={styles.jumpModalConfirmText}>Go</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingVertical: SPACING.smd,
        paddingHorizontal: SPACING.md,
        gap: SPACING.smd,
        flexWrap: "wrap",
    },
    paginationControls: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: 'center',
    },
    pageNumbersWrapper: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xs,
        marginHorizontal: SPACING.xs,
    },
    pageButton: {
        paddingVertical: SPACING.xsm,
        paddingHorizontal: SPACING.sm,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.background,
    },
    pageButtonDisabled: {
        backgroundColor: "transparent",
        opacity: 0.5,
    },
    pageButtonText: {
        fontSize: FONT_SIZE.smd,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    pageButtonTextDisabled: {
        color: COLORS.textDisabled,
    },
    pageNumberButton: {
        minWidth: 32,
        height: 32,
        paddingHorizontal: SPACING.xsm,
        borderRadius: RADIUS.sm,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    pageNumberButtonActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    pageNumberButtonDisabled: {
        borderColor: COLORS.paginationDisabledBorder,
    },
    pageNumberText: {
        fontSize: FONT_SIZE.smd,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    pageNumberTextActive: {
        color: COLORS.primaryText,
    },
    ellipsisContainer: {
        width: 18,
        height: 32,
        justifyContent: "center",
        alignItems: "center",
    },
    ellipsisText: {
        fontSize: FONT_SIZE.md,
        fontWeight: "600",
        color: COLORS.paginationEllipsis,
        letterSpacing: 1,
    },
    jumpTriggerButton: {
        paddingVertical: SPACING.xsm,
        paddingHorizontal: SPACING.smd,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surface,
        justifyContent: "center",
        alignItems: "center",
        marginHorizontal: SPACING.xs,
    },
    jumpTriggerText: {
        fontSize: FONT_SIZE.smd,
        fontWeight: "500",
        color: COLORS.textSecondary,
    },
    jumpTriggerHighlight: {
        fontWeight: "700",
        color: COLORS.primary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: COLORS.overlayLight,
        justifyContent: "center",
        alignItems: "center",
        padding: SPACING.xl,
    },
    jumpModalCard: {
        width: "100%",
        maxWidth: 280,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.xl,
        alignItems: "center",
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    jumpModalTitle: {
        fontSize: FONT_SIZE.lg,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    jumpModalSubtitle: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.lg,
        textAlign: "center",
    },
    jumpInput: {
        width: "100%",
        height: 44,
        backgroundColor: COLORS.inputBg,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        borderRadius: RADIUS.md,
        textAlign: "center",
        fontSize: FONT_SIZE.lg,
        fontWeight: "600",
        color: COLORS.textPrimary,
        marginBottom: SPACING.lg,
    },
    jumpModalActions: {
        flexDirection: "row",
        gap: SPACING.smd,
        width: "100%",
    },
    jumpModalCancelButton: {
        flex: 1,
        height: 38,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.neutralBg,
    },
    jumpModalCancelText: {
        fontSize: FONT_SIZE.smd,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    jumpModalConfirmButton: {
        flex: 1,
        height: 38,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.primary,
    },
    jumpModalConfirmText: {
        fontSize: FONT_SIZE.smd,
        fontWeight: "600",
        color: COLORS.primaryText,
    },
});
