import {StyleSheet} from "react-native";

export
const styles = StyleSheet.create({
    pageBody: {
        padding: 10,
        paddingTop: 40,
        backgroundColor: '#fff',
    },
    heading: {
        fontSize: 24,
        fontWeight: 'bold',
        marginVertical: 10,
        textAlign: 'center',
        color: '#777',
    },
    reviewGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    reviewColumn: {
        flex: 1,
        margin: 10,
        minWidth: 155,
    },
    reviewBox: {
        backgroundColor: '#f9f9f9',
        borderRadius: 10,
        padding: 10,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    reviewTab: {
        backgroundColor: '#fff',
        borderRadius: 15,
        marginVertical: 10,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    reviewHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#777',
    },
    reviewContent: {
        marginVertical: 5,
        color: '#777',
    },
    reviewDate: {
        color: '#0D9813',
    },
    deleteIcon: {
        width: 20,
        height: 20,
        marginTop: 5,
    },
    boxText: {
        textAlign: 'center',
        fontWeight: 'bold',
        marginVertical: 5,
        color: '#777',
    },
    alertText: {
        textAlign: 'center',
        marginVertical: 10,
        color: '#777',
    },
});