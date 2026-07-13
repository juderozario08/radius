//radius-frontend/src/components/common/HeaderComponent.tsx
import { View } from "react-native";

interface HeaderComponentType {
    headerRight?: React.ReactNode;
    headerLeft?: React.ReactNode;
    headerCenter?: React.ReactNode;
}

const HeaderComponent = ({ headerRight, headerLeft, headerCenter }: HeaderComponentType) => {
    return (
        <View style={{
            height: 100,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 10,
            backgroundColor: '#fff',
            borderBottomWidth: 1,
            borderBottomColor: '#eee',
            paddingTop: 50,
            zIndex: 1,
        }}>
            <View style={{ flex: 1, justifyContent: 'flex-start', alignItems: 'center', flexDirection: 'row', zIndex: 1 }}>
                {headerLeft}
            </View>
            <View style={{
                position: 'absolute',
                top: 50,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 0,
            }}>
                {headerCenter}
            </View>
            <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', flexDirection: 'row', zIndex: 1 }}>
                {headerRight}
            </View>
        </View>
    )
}

export default HeaderComponent;
