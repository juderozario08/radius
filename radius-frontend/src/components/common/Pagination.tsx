// radius-frontend/src/components/common/Pagination.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "@/constants/colors";
import Dropdown from "./Dropdown";

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
    if (totalPages <= 1 && (!pageSizeOptions || pageSizeOptions.length === 0)) return null;

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

    const paginationItems = getPaginationItems();
    const isPrevDisabled = currentPage === 1 || isLoading;
    const isNextDisabled = currentPage === totalPages || isLoading;

    const dropdownOptions = pageSizeOptions
        ? pageSizeOptions.map(size => ({ label: `${size} / page`, value: size }))
        : [];

    return (
        <View style={styles.container}>

            {/* Left Side: Page Navigation (Only show if multiple pages exist) */}
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
                                                isActive && styles.pageNumberTextActive,
                                                (isLoading && !isActive) && styles.pageButtonTextDisabled,
                                            ]}
                                        >
                                            {page}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

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

            {/* Right Side: Page Size Dropdown */}
            {pageSizeOptions && onPageSizeChange && pageSize && (
                <Dropdown
                    options={dropdownOptions}
                    value={pageSize}
                    onSelect={onPageSizeChange}
                    title="Items per page"
                    disabled={isLoading}
                />
            )}

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
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 10
    },
    paginationControls: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: 'center',
    },
    pageNumbersWrapper: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginHorizontal: 4,
    },
    pageButton: {
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 6,
        backgroundColor: "#f5f5f5",
    },
    pageButtonDisabled: {
        backgroundColor: "transparent",
        opacity: 0.5,
    },
    pageButtonText: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    pageButtonTextDisabled: {
        color: "#ccc",
    },
    pageNumberButton: {
        width: 32,
        height: 32,
        borderRadius: 6,
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
        borderColor: "#eaeaea",
    },
    pageNumberText: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    pageNumberTextActive: {
        color: "#FFFFFF",
    },
    ellipsisContainer: {
        width: 18,
        height: 32,
        justifyContent: "center",
        alignItems: "center",
    },
    ellipsisText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#888",
        letterSpacing: 1,
    },
});
