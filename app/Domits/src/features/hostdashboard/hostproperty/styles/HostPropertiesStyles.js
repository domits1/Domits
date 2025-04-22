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
        marginBottom: 10,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: '#003366',
        borderRadius: 10,
        margin: 20,
        marginBottom: 0,
        marginTop: 30,
    },
    listItemText: {
        fontSize: 18,
    },
    accommodationItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    accommodationImage: {
        width: 100,
        height: 100,
        marginRight: 10,
        borderRadius: 10,
    },
    accommodationText: {
        flex: 1,
    },
    accommodationName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    noListingsText: {
        textAlign: 'center',
        marginTop: 20,
        color: '#777',
    },
});
