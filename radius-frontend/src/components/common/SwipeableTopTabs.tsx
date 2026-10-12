import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import { createMaterialTopTabNavigator, MaterialTopTabBar, MaterialTopTabBarProps } from "@react-navigation/material-top-tabs";
import { COLORS } from "@/constants/colors";
import { SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";

const Tab = createMaterialTopTabNavigator();

interface TabScreen {
    name: string;
    children: () => React.ReactElement;
}

interface SwipeableTopTabsProps {
    tabs: TabScreen[];
    renderAboveContent?: () => React.ReactNode;
    onTabChange?: (index: number) => void;
}

function TabBarWrapper({
    tabBarProps,
    renderAboveContent,
    onTabChange,
}: {
    tabBarProps: MaterialTopTabBarProps;
    renderAboveContent?: () => React.ReactNode;
    onTabChange?: (index: number) => void;
}) {
    const activeIndex = tabBarProps.state.index;
    const prevIndexRef = useRef(activeIndex);
    useEffect(() => {
        if (prevIndexRef.current !== activeIndex) {
            prevIndexRef.current = activeIndex;
            onTabChange?.(activeIndex);
        }
    }, [activeIndex, onTabChange]);
    let touchStartX = 0;

    return (
        <View
            style={{ backgroundColor: COLORS.headerBackground }}
            onTouchStart={(e) => (touchStartX = e.nativeEvent.pageX)}
            onTouchEnd={(e) => {
                const deltaX = touchStartX - e.nativeEvent.pageX;
                const tabNames = tabBarProps.state.routeNames;
                if (deltaX > 50 && activeIndex < tabNames.length - 1) {
                    tabBarProps.navigation.navigate(tabNames[activeIndex + 1]);
                }
                if (deltaX < -50 && activeIndex > 0) {
                    tabBarProps.navigation.navigate(tabNames[activeIndex - 1]);
                }
            }}
        >
            <MaterialTopTabBar {...tabBarProps} />
            {renderAboveContent?.()}
        </View>
    );
}

export function SwipeableTopTabs({ tabs, renderAboveContent, onTabChange }: SwipeableTopTabsProps) {
    return (
        <Tab.Navigator
            tabBar={(props) => (
                <TabBarWrapper
                    tabBarProps={props}
                    renderAboveContent={renderAboveContent}
                    onTabChange={onTabChange}
                />
            )}
            screenOptions={{
                tabBarActiveTintColor: COLORS.textPrimary,
                tabBarInactiveTintColor: COLORS.textSecondary,
                tabBarIndicatorStyle: {
                    height: 40,
                    bottom: 3,
                    borderRadius: RADIUS.md,
                    backgroundColor: "white",
                    shadowColor: COLORS.black,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 1,
                    elevation: 1,
                },
                tabBarLabelStyle: {
                    fontWeight: "600",
                    fontSize: FONT_SIZE.smd,
                    textTransform: "none",
                },
                tabBarStyle: {
                    backgroundColor: COLORS.tabBarBg,
                    elevation: 0,
                    shadowOpacity: 0,
                    marginHorizontal: SPACING.lg,
                    marginTop: SPACING.xs,
                    marginBottom: SPACING.sm,
                    borderRadius: RADIUS.lg,
                    height: 46,
                },
            }}
        >
            {tabs.map((tab) => (
                <Tab.Screen key={tab.name} name={tab.name}>
                    {tab.children}
                </Tab.Screen>
            ))}
        </Tab.Navigator>
    );
}
