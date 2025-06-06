import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const ChatMessage = ({ message, userId, contactName, }) => {
    const { userId: senderId, text, createdAt, fileUrls = [] } = message;

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    };

    const isCurrentUser = senderId === userId;

    return (
        <View
            style={[
                styles.messageContainer,
                isCurrentUser ? styles.messageRight : styles.messageLeft,
            ]}
        >
            <View style={styles.messageContent}>
                <View style={isCurrentUser ? styles.youHeader : styles.senderHeader}>
                    {!isCurrentUser && (
                        <>
                            <Image
                                source={require('../pictures/domits-logo.jpg')}
                                style={styles.senderImage}
                            />
                            <Text style={styles.senderName}>{contactName}</Text>
                            <Text style={styles.senderMessageDate}>{formatDate(createdAt)}</Text>
                        </>
                    )}

                    {isCurrentUser && (
                        <>
                            <Text style={styles.youMessageDate}>{formatDate(createdAt)}</Text>
                            <Text style={styles.youLabel}>YOU</Text>
                            <Image
                                source={require('../pictures/domits-logo.jpg')}
                                style={styles.youImage}
                            />
                        </>
                    )}
                </View>

                <Text style={isCurrentUser ? styles.youMessageText : styles.senderMessageText}>
                    {text}
                </Text>

                {fileUrls.length > 0 && (
                    <View
                        style={[
                            { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap' },
                            isCurrentUser ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' },
                        ]}
                    >
                        {fileUrls.map((fileUrl, index) => {
                            const isVideo = fileUrl.endsWith('.mp4');
                            return isVideo ? (
                                <Image
                                    key={index}
                                    source={{ uri: fileUrl }}
                                    useNativeControls
                                    resizeMode="contain"
                                    style={{ width: 200, height: 150, marginTop: 5 }}
                                />
                            ) : (
                                <Image
                                    key={index}
                                    source={{ uri: fileUrl }}
                                    style={{ width: 200, height: 150, marginTop: 5, borderRadius: 10 }}
                                    resizeMode="cover"
                                />
                            );
                        })}
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
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
    youHeader: {
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
    youImage: {
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
    youLabel: {
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
    youMessageText: {
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
    youMessageDate: {
        fontSize: 12,
        color: 'black',
        alignSelf: 'center',
        marginRight: 10,
        fontWeight: '500',
    },
});

export default ChatMessage;
