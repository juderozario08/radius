import React from "react";
import { COLORS } from "@/constants/colors";
import { EmployeeRole } from "@/types/auth.types";
import { capitalize } from "@/utils/helpers";
import { Badge } from "@/components/common/Badge";

const ROLE_COLORS: Record<EmployeeRole, { bg: string, text: string }> = {
    SALES: { bg: "#E3F2FD", text: "#1976D2" },
    SERVICE: { bg: "#F3E5F5", text: "#7B1FA2" },
    MANAGER: { bg: "#E8F5E9", text: "#388E3C" },
    ADMIN: { bg: "#FFF3E0", text: "#F57C00" },
};

export const RoleBadge: React.FC<{ role: EmployeeRole }> = ({ role }) => {
    const colors = ROLE_COLORS[role] || { bg: COLORS.inactiveBg, text: COLORS.inactiveText };

    return <Badge label={capitalize(role)} backgroundColor={colors.bg} color={colors.text} />;
};
