import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    tabAll: {
        flex: 1,
        backgroundColor: 'white',
    },
    tabBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: 'white',
        paddingVertical: 10,
        marginTop: 75,
    },
    tabText: {
        fontSize: 16,
        color: 'black',
    },
    activeTabText: {
        color: '#0fa616',

    },
    screenContainer: {
        flex: 1,
        backgroundColor: 'white',
        padding: 10,
    },
})