import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 0,
        paddingVertical: 20,
        paddingHorizontal: 10,
        borderBottomWidth: 0.5,
        borderColor: '#e0e0e0',
    },
   
    profileImage: {
        width: 35,
        height: 35,
        borderRadius: 25,
        marginRight: 15,
        backgroundColor: '#e0e0e0',
    },
    textContainer: {
        flex: 1,
    },
    fullName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    subtitle: {
        fontSize: 15,
        color: '#555',
        marginTop: 3,

    },
});
