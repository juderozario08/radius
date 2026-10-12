import React from "react";
import { Badge } from "@/components/common/Badge";
import { COLORS } from "@/constants/colors";

export const TerminatedBadge: React.FC<{ isTerminated: boolean }> = ({ isTerminated }) => {
    if (!isTerminated) return null;

    return <Badge label="Terminated" backgroundColor={COLORS.terminatedBg} color={COLORS.terminatedText} />;
};
