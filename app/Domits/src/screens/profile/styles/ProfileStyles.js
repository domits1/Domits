import {StyleSheet} from "react-native";


export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    header: {
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        marginBottom: 30,
        marginTop: 10,
    },
    headerText: {
        fontSize: 30,
        fontWeight: 'bold',
    },
    listItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 20,
        margin: 10,
    },
    listItemText: {
        fontSize: 18,
    },
    listItemTitle: {
        fontSize: 15,
        margin: 10,
    },
    avatarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    deactivateText: {
        fontSize: 18,
        color: 'red',
    },
});