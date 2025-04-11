import {StyleSheet} from "react-native";

export const styles = StyleSheet.create({
    // General
    categoryTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'black',
        marginBottom: 5,
    },
    categorySubTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'black',
        marginTop: 5,
    },
    // Host info
    hostInfoContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginTop: 15,
        padding: 10,
    },
    // Host name
    nameButton: {
        borderWidth: 1,
        borderColor: 'green',
        borderRadius: 12,
        padding: 10,
    },
    nameText: {
        color: 'black',
        fontSize: 12,
        fontFamily: 'MotivaSansBold.woff',
        textAlign: 'center',
    },
    // Host email
    hostEmailContainer: {
        flexDirection: 'row',
        padding: 10,
    },
    hostEmailIcon: {
        paddingHorizontal: 5,
    },
    hostEmailText: {
        color: 'black',
    },
})