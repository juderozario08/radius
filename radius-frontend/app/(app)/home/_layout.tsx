import {
    createMaterialTopTabNavigator,
    MaterialTopTabNavigationOptions,
    MaterialTopTabNavigationEventMap,
} from "@react-navigation/material-top-tabs";
import { withLayoutContext } from "expo-router";
import { ParamListBase, TabNavigationState } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";

const { Navigator } = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext<
    MaterialTopTabNavigationOptions,
    typeof Navigator,
    TabNavigationState<ParamListBase>,
    MaterialTopTabNavigationEventMap
>(Navigator);

const activeDotColor = "#C70202";
const inactiveDotColor = "#D1D1D6";

function DotIndicator({ state }: { state: TabNavigationState<ParamListBase> }) {
    return (
        <View style={styles.dotContainer} pointerEvents="none">
            {state.routes.map((route, index) => (
                <View
                    key={route.key}
                    style={[
                        styles.dot,
                        { backgroundColor: index === state.index ? activeDotColor : inactiveDotColor },
                    ]}
                />
            ))}
        </View>
    );
}

export default function HomeLayout() {
    return (
        <MaterialTopTabs
            tabBarPosition="bottom"
            tabBar={({ state }) => <DotIndicator state={state} />}
            screenOptions={{
                swipeEnabled: true,
            }}
        >
            <MaterialTopTabs.Screen name="dashboard" />
            <MaterialTopTabs.Screen name="actions" />
        </MaterialTopTabs>
    );
}

const styles = StyleSheet.create({
    dotContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 10,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
});
