import {StyleSheet} from "react-native";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        marginTop: 20,
        paddingHorizontal: 20,
    },
    welcomeText: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    descriptionText: {
        fontSize: 16,
        color: 'gray',
        marginTop: 8,
        marginBottom: 20,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    listItemText: {
        fontSize: 18,
        color: 'black',
    },
    helpSection: {
        marginTop: 20,
        paddingHorizontal: 20,
    },
    helpText: {
        fontSize: 16,
        color: 'gray',
    },
    helpButton: {
        marginTop: 10,
    },
    helpButtonText: {
        fontSize: 18,
        color: '#000',
    },
});