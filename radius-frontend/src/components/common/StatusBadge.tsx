import React from "react";
import { COLORS } from "@/constants/colors";
import { Badge } from "@/components/common/Badge";

export const StatusBadge: React.FC<{ isActive: boolean }> = ({ isActive }) => (
    <Badge
        label={isActive ? "Active" : "Inactive"}
        backgroundColor={isActive ? COLORS.activeBg : COLORS.inactiveBg}
        color={isActive ? COLORS.activeText : COLORS.inactiveText}
    />
);
