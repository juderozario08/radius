//radius-frontend/app/(app)/home/_layout.tsx
import {
    createMaterialTopTabNavigator,
    MaterialTopTabNavigationOptions,
    MaterialTopTabNavigationEventMap,
} from "@react-navigation/material-top-tabs";
import { withLayoutContext, useSegments } from "expo-router";
import { ParamListBase, TabNavigationState } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";
import { COLORS } from "@/constants/colors";

const { Navigator } = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext<
    MaterialTopTabNavigationOptions,
    typeof Navigator,
    TabNavigationState<ParamListBase>,
    MaterialTopTabNavigationEventMap
>(Navigator);

function DotIndicator({ state, isVisible = true }: { state: TabNavigationState<ParamListBase>; isVisible?: boolean }) {
    if (!isVisible) return null;

    return (
        <View style={styles.dotContainer} pointerEvents="none">
            {state.routes.map((route, index) => (
                <View
                    key={route.key}
                    style={[
                        styles.dot,
                        { backgroundColor: index === state.index ? COLORS.activeDot : COLORS.inactiveDot },
                    ]}
                ></View>
            ))}
        </View>
    );
}

export default function HomeLayout() {
    const segments = useSegments();
    const isSwipeEnabled = segments.length <= 4;

    return (
        <View style={{ flex: 1 }}>
            <MaterialTopTabs
                tabBarPosition="bottom"
                tabBar={({ state }) => <DotIndicator state={state} isVisible={isSwipeEnabled} />}
                screenOptions={{
                    swipeEnabled: isSwipeEnabled,
                }}
            >
                <MaterialTopTabs.Screen name="dashboard" />
                <MaterialTopTabs.Screen name="actions" />
            </MaterialTopTabs>
        </View>
    );
}

const styles = StyleSheet.create({
    dotContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 10,
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "transparent",
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
});
