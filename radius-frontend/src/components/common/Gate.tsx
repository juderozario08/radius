// radius-frontend/src/components/common/Gate.tsx
import { useAuth } from "@/hooks/useAuth";
import { hasPermission, Permission } from "@/utils/roles";
import { ReactNode } from "react";

interface GateProps {
    permission: Permission;
    children: ReactNode;
    fallback?: ReactNode;
}

export default function Gate({ permission, children, fallback = null }: GateProps) {
    const { user } = useAuth();

    if (hasPermission(user?.role, permission)) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
}
