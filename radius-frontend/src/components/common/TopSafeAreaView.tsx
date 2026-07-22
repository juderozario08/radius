//radius-frontend/src/components/common/TopSafeAreaView.tsx
import { globalStyles } from "@/constants/styles";
import React from "react";
import { SafeAreaView, SafeAreaViewProps } from "react-native-safe-area-context";

export const TopSafeAreaView: React.FC<SafeAreaViewProps> = ({ edges, style, children, ...props }) => (
    <SafeAreaView style={[globalStyles.safeAreaContainer, style]} edges={['top']} {...props}>
        {children}
    </SafeAreaView>
);
