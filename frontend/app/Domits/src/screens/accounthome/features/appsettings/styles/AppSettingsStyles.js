import {StyleSheet} from "react-native";

export const styles = StyleSheet.create({
    areaContainer: {
        flex: 1,
    },
    scrollContainer: {
        flex: 1,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    listItemText: {
        fontSize: 16,
    },
})