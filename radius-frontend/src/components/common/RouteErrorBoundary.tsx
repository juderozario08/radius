import { globalStyles } from "@/constants/styles";
import type { ErrorBoundaryProps } from "expo-router";
import React from "react";
import { View } from "react-native";
import { ErrorMessage } from "./ErrorMessage";
import { TopSafeAreaView } from "./TopSafeAreaView";

export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

export function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
    const message = __DEV__ && error?.message ? error.message : GENERIC_ERROR_MESSAGE;

    return (
        <TopSafeAreaView>
            <View style={globalStyles.centerElement}>
                <ErrorMessage message={message} onRetry={retry} />
            </View>
        </TopSafeAreaView>
    );
}
