import {StyleSheet} from "react-native";

export const styles = StyleSheet.create({
    container: {
        height: 284,
        flexDirection: "column",
        width: '90%',
        marginBottom: 20,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#fff',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    image: {
        width: "100%",
        height: 200,
    },
    row: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 10,
    },
    propertyLocation: {
        fontSize: 16,
        color: "black",
        fontWeight: 'bold',
        maxWidth: '50%',
        height: 40
    },
    bookingStatus: {
        fontSize: 16,
        color: "black",
        fontWeight: 'bold',
        maxWidth: '50%'
    },
    dates: {
        color: 'black',
        fontWeight: '500',
    }
});
