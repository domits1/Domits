import {StyleSheet} from "react-native";

export const styles = StyleSheet.create({
    messageContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginVertical: 5,
    },
    messageLeft: {
        alignSelf: 'flex-start',
    },
    messageRight: {
        alignSelf: 'flex-end',
        flexDirection: 'row-reverse',
    },
    messageContent: {
        maxWidth: '95%',
        padding: 10,
        borderRadius: 10,
        backgroundColor: 'white',
        width: '100%',
    },
    senderHeader: {
        flexDirection: 'row',
        marginBottom: 5,
        alignItems: 'center',
    },
    userHeader: {
        flexDirection: 'row',
        marginBottom: 5,
        alignItems: 'center',
        alignSelf: 'flex-end',
    },
    senderImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 5,
    },
    userImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 5,
    },
    senderName: {
        fontSize: 20,
        color: 'black',
        fontWeight: '500',
        marginLeft: 10,
    },
    userLabel: {
        fontSize: 16,
        color: 'black',
        fontWeight: '500',
        marginRight: 10,
    },
    senderMessageText: {
        fontSize: 16,
        color: '#333',
        marginLeft: 16,
        marginTop: 2,
        fontWeight: '400',
        borderColor: 'green',
        paddingTop: 8,
        maxWidth: '90%',
    },
    userMessageText: {
        fontSize: 16,
        color: '#333',
        marginRight: 15,
        marginTop: 2,
        alignSelf: 'flex-end',
        paddingTop: 8,
        maxWidth: '100%',
    },
    senderMessageDate: {
        fontSize: 12,
        color: 'black',
        marginLeft: 10,
        alignSelf: 'center',
        fontWeight: '500',
    },
    userMessageDate: {
        fontSize: 12,
        color: 'black',
        alignSelf: 'center',
        marginRight: 10,
        fontWeight: '500',
    },
});