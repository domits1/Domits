import {StyleSheet} from "react-native";

const styles = StyleSheet.create({
    card: {
        overflow: 'hidden',
        margin: 16,
        elevation: 4,
        color: '#000000',
    },

    image: {
        width: '100%',
        height: 400,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.1,
        shadowRadius: 8,
        marginBottom: 8,
    },

    favorite: {
        position: 'absolute',
        right: 20,
        top: 20
    },

    details: {
        padding: 12,
    },

    title: {
        width: '98%',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    address: {
        fontSize: 18,
        letterSpacing: 1.5,
        textDecorationStyle: 'solid',
        fontWeight: 'bold',
        color: "#000000"
    },

    price: {
        fontSize: 18,
        letterSpacing: 1.5,
        textDecorationLine: 'underline',
        textDecorationStyle: 'solid',
        fontWeight: 'bold',
        color: "#000000"
    },

    night: {
        fontWeight: 'bold',
    },
});

export default styles;
