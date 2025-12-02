import {StyleSheet, Platform} from "react-native";

export const styles = StyleSheet.create({
    // Tab bar
    bottomTabBar: {
        backgroundColor: 'transparent',
        borderTopColor: '#d3d3d3',
        borderTopWidth: 1,
        height: Platform.OS === 'ios' ? 77 : 60,
        paddingBottom: Platform.OS === 'ios' ? 8 : 10,
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