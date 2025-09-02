import {StyleSheet} from "react-native";

export const styles = StyleSheet.create({
    // Tab bar
    bottomTabBar: {
        backgroundColor: '#f0f0f0',
        borderTopColor: 'transparent',
        height: 80,
        paddingBottom: 15,
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