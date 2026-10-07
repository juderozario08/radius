import React from "react";
import { Badge } from "@/components/common/Badge";

export const TerminatedBadge: React.FC<{ isTerminated: boolean }> = ({ isTerminated }) => {
    if (!isTerminated) return null;

    return <Badge label="Terminated" backgroundColor="#FFEBEB" color="#CC0000" />;
};
