import {StyleSheet} from "react-native";

export const styles = StyleSheet.create({
    messageContainer: {
        marginVertical: 5,
        width: '100%',
    },
    messageLeft: {
        alignSelf: 'flex-start',
    },
    messageRight: {
        alignSelf: 'flex-end',
    },
    messageWrapper: {
        maxWidth: '95%',
        flexShrink: 1,
        alignItems: 'flex-start',
    },
    messageWrapperRight: {
        alignItems: 'flex-end',
    },
    messageContent: {
        padding: 10,
        borderRadius: 10,
        backgroundColor: 'white',
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    userMessageBubble: {
        backgroundColor: '#E8F5E9',
    },
    messageTextContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    imageContainerWrapper: {
        maxWidth: '95%',
        alignItems: 'flex-start',
    },
    imageContainerWrapperRight: {
        alignItems: 'flex-end',
    },
    imageContainer: {
        flexDirection: 'column',
    },
    imageWrapper: {
        alignItems: 'flex-start',
        marginBottom: 5,
    },
    imageWrapperRight: {
        alignItems: 'flex-end',
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
        fontWeight: '400',
        textAlign: 'left',
    },
    userMessageText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '400',
        textAlign: 'left',
    },
    timestamp: {
        fontSize: 11,
        color: '#666',
        marginTop: 4,
        alignSelf: 'flex-start',
    },
    timestampRight: {
        alignSelf: 'flex-end',
    },
});