//radius-frontend/src/components/common/HeaderComponent.tsx
import { COLORS } from "@/constants/colors";
import { View } from "react-native";

interface HeaderComponentType {
    headerRight?: React.ReactNode | React.ReactNode[];
    headerLeft?: React.ReactNode | React.ReactNode[];
    headerCenter?: React.ReactNode;
}

const HeaderComponent = ({ headerRight, headerLeft, headerCenter }: HeaderComponentType) => {
    return (
        <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 10,
            backgroundColor: COLORS.headerBackground,
            borderBottomWidth: 1,
            borderBottomColor: '#eee',
            minHeight: 50,
            zIndex: 1,
        }}>
            <View style={{ flex: 1, justifyContent: 'flex-start', alignItems: 'center', flexDirection: 'row', zIndex: 1, gap: 10 }}>
                {headerLeft && Array.isArray(headerLeft) ? headerLeft.map((e, idx) => <View key={idx}>{e}</View>) : headerLeft}
            </View>
            <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 0,
            }}>
                {headerCenter}
            </View>
            <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', flexDirection: 'row', zIndex: 1, gap: 10 }}>
                {headerRight && Array.isArray(headerRight) ? headerRight.map((e, idx) => <View key={idx}>{e}</View>) : headerRight}
            </View>
        </View>
    )
}

export default HeaderComponent;
