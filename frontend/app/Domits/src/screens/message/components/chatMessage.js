import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { styles } from '../styles/chatMessageStyles';

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
                <View style={isCurrentUser ? styles.userHeader : styles.senderHeader}>
                    {!isCurrentUser && (
                        <>
                            <Image
                                source={require('../../pictures/domits-logo.jpg')}
                                style={styles.senderImage}
                            />
                            <Text style={styles.senderName}>{contactName}</Text>
                            <Text style={styles.senderMessageDate}>{formatDate(createdAt)}</Text>
                        </>
                    )}

                    {isCurrentUser && (
                        <>
                            <Text style={styles.userMessageDate}>{formatDate(createdAt)}</Text>
                            <Text style={styles.userLabel}>YOU</Text>
                            <Image
                                source={require('../../pictures/domits-logo.jpg')}
                                style={styles.userImage}
                            />
                        </>
                    )}
                </View>

                <Text style={isCurrentUser ? styles.userMessageText : styles.senderMessageText}>
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



export default ChatMessage;
