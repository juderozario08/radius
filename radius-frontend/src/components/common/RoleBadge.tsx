import React from "react";
import { COLORS } from "@/constants/colors";
import { EmployeeRole } from "@/types/auth.types";
import { capitalize } from "@/utils/helpers";
import { Badge } from "@/components/common/Badge";

const ROLE_COLORS: Record<EmployeeRole, { bg: string, text: string }> = {
    SALES: { bg: COLORS.infoBg, text: COLORS.infoAccent },
    SERVICE: { bg: COLORS.purpleBg, text: COLORS.purpleAccent },
    MANAGER: { bg: COLORS.activeBg, text: COLORS.successAccent },
    ADMIN: { bg: COLORS.warningBg, text: COLORS.warningAccent },
};

export const RoleBadge: React.FC<{ role: EmployeeRole }> = ({ role }) => {
    const colors = ROLE_COLORS[role] || { bg: COLORS.inactiveBg, text: COLORS.inactiveText };

    return <Badge label={capitalize(role)} backgroundColor={colors.bg} color={colors.text} />;
};
