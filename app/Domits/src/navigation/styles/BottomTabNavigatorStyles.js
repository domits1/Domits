import {StyleSheet} from "react-native";

export const styles = StyleSheet.create({
    // Tab bar
    bottomTabBar: {
        backgroundColor: '#f0f0f0',
        borderTopColor: 'transparent',
        height: 60,
        paddingBottom: 10,
    },
    // Nav item
    tabBarItem: {
        flexDirection: 'column',
    },
    navigationItem: {
        alignItems: 'center',
    },
    navigationItemText: {
        fontSize: 12,
    },
    // Focused item
    navItemFocusedColor: {
        color: '#007AFF',
    },
    navItemDefaultColor: {
        color: 'grey',
    },
})