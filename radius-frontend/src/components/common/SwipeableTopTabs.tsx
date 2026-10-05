import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import { createMaterialTopTabNavigator, MaterialTopTabBar } from "@react-navigation/material-top-tabs";
import { COLORS } from "@/constants/colors";

const Tab = createMaterialTopTabNavigator();

interface TabScreen {
    name: string;
    children: (props: any) => React.ReactElement;
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
    tabBarProps: any;
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
                    borderRadius: 8,
                    backgroundColor: "white",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 1,
                    elevation: 1,
                },
                tabBarLabelStyle: {
                    fontWeight: "600",
                    fontSize: 13,
                    textTransform: "none",
                },
                tabBarStyle: {
                    backgroundColor: "#EFEFEF",
                    elevation: 0,
                    shadowOpacity: 0,
                    marginHorizontal: 16,
                    marginTop: 4,
                    marginBottom: 8,
                    borderRadius: 12,
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
