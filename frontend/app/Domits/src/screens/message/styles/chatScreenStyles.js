import { StyleSheet } from "react-native";

 export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    chatContainer: {
        padding: 10,
    },
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
        // borderWidth: 1,
    },
    senderHeader: {
        flexDirection: 'row',
        marginBottom: 5,
        flexDirection: 'row',
        alignItems: 'center',
    },
    youHeader: {
        flexDirection: 'row',
        marginBottom: 5,
        alignItems: 'center',
        alignSelf: 'flex-end',
        borderColor: 'green',
    },
    senderName: {
        fontSize: 20,
        color: 'black',
        fontWeight: '500',
        marginLeft: 10,
        justifyContent: 'center',
    },
    youLabel: {
        fontSize: 16,
        color: 'black',
        fontWeight: '500',
        marginRight: 10,

    },
    senderImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 5,
    },
    youImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 5,

    },
    senderMessageText: {
        fontSize: 16,
        color: '#333',
        marginLeft: 16,
        marginTop: 2,
        fontWeight: '400',
        // borderLeftWidth: 2,
        borderColor: 'green',
        borderStyle: 'solid',
        paddingTop: 8,

        width: 'auto',
        maxWidth: '90%',
    },
    youMessageText: {
        fontSize: 16,
        color: '#333',
        marginRight: 15,
        marginTop: 2,
        alignSelf: 'flex-end',
        paddingTop: 8,

        width: 'auto',
        maxWidth: '100%',
        // borderBottomWidth: 1,

    },
    senderMessageDate: {
        fontSize: 12,
        color: 'black',
        marginLeft: 10,
        alignSelf: 'center',
        fontWeight: '500',

    },
    youMessageDate: {
        fontSize: 12,
        color: 'black',
        alignSelf: 'center',
        marginRight: 10,
        fontWeight: '500',

    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,

        borderTopColor: '#ddd',
    },
    input: {
        flex: 1,
        height: 40,
        borderColor: 'green',
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 15,
        marginRight: 10,
        marginLeft: 10,
        backgroundColor: 'white',
    },
    icon: {
        marginLeft: 10,
    },
    sendButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 20,
    },
    sendButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});