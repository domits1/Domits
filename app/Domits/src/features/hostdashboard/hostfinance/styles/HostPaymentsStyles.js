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
        fontSize: 20,
        fontWeight: 'bold',
    },
    boxColumns: {
        margin: 10,
        flexDirection: 'column',
    },
    boxRows: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfBox: {
        flex: 1,
    },
    box: {
        elevation: 1,
        shadowColor: '#003366',
        padding: 10,
        margin: 10,
        minHeight: 150,
        borderRadius: 2,
        borderWidth: 0.5,
        borderColor: '#003366',
    },
    boxText: {
        borderWidth: 1,
        borderColor: '#003366',
        borderRadius: 15,
        padding: 5,
    },
});