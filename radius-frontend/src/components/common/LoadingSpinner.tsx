import React from "react";
import { ActivityIndicator, ActivityIndicatorProps } from "react-native";
import { COLORS } from "@/constants/colors";

export const LoadingSpinner: React.FC<ActivityIndicatorProps> = ({ size = "large", color = COLORS.primary, ...rest }) => (
    <ActivityIndicator size={size} color={color} {...rest} />
);
