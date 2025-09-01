import {StyleSheet} from "react-native";

export const styles = StyleSheet.create({
    // Tab bar
    bottomTabBar: {
        backgroundColor: 'white',
        borderTopColor: 'black',
        borderTopWidth: 0.5,
        height: 80,
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