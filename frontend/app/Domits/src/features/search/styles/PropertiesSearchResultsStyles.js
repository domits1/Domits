import {StyleSheet} from "react-native";

export const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-evenly',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 20,
    },
    image: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 15,
        aspectRatio: 1,
        alignSelf: 'center'
    },
    cardContent: {
        padding: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    price: {
        fontSize: 16,
        color: 'black',
        fontWeight: 'bold',
        textDecorationLine: 'underline'
    },
    details: {
        fontSize: 14,
        marginTop: 5,
    },
    specs: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 10,
    },
    spec: {
        fontSize: 12,
        color: '#555',
    },
});