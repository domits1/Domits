import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Image } from 'react-native';
import { v4 as uuidv4 } from 'uuid';

import useFetchMessages from './Hooks/useFetchMessages';
import { useSendMessage } from './Hooks/useSendMessage';
import ChatMessage from './chatMessage';
import { WebSocketContext } from './context/webSocketContext';
import ChatUploadAttachment from './chatUploadAttachment';


const ChatScreen = ({ route }) => {
    const { userId, recipientId, contactName } = route.params;
    const { messages, loading, error, fetchMessages, addNewMessage } = useFetchMessages(userId);
    const { sendMessage, sending, error: sendError } = useSendMessage(userId);
    const [newMessage, setNewMessage] = useState('');
    const socket = useContext(WebSocketContext);
    const wsMessages = socket?.messages || [];
    const addedMessageIds = useRef(new Set());
    const [uploadedFileUrls, setUploadedFileUrls] = useState([]);

    useEffect(() => {
        if (recipientId) {
            fetchMessages(recipientId);
        }
    }, [userId, recipientId, fetchMessages]);

    useEffect(() => {
        wsMessages.forEach((msg) => {
            const isRelevant =
                (msg.userId === userId && msg.recipientId === recipientId) ||
                (msg.userId === recipientId && msg.recipientId === userId);
            const isNew = !addedMessageIds.current.has(msg.id);

            if (isRelevant && isNew) {
                addNewMessage(msg);
                addedMessageIds.current.add(msg.id);
            }
        });
    }, [wsMessages, userId, recipientId]);

    const handleSendMessage = async () => {
        if ((newMessage.trim() || uploadedFileUrls.length > 0) && (uploadedFileUrls.length > 0 || newMessage.trim())) {
            try {
                const response = await sendMessage(recipientId, newMessage, uploadedFileUrls);

                if (!response || !response.success) {
                    alert(`Fout bij verzenden: ${response.error || 'Probeer het later opnieuw.'}`);
                    return;
                }
                // only for UI
                const tempSentMessage = {
                    id: uuidv4(),
                    userId,
                    recipientId: recipientId,
                    text: newMessage,
                    fileUrls: uploadedFileUrls,
                    createdAt: new Date().toISOString(),
                    isSent: true,
                };

                addNewMessage(tempSentMessage);
                setNewMessage('');
                setUploadedFileUrls([]);
            } catch (error) {
                console.error('Onverwachte fout bij verzenden:', error);
            }
        }
    };

    const handleKeyUp = (e) => {
        if (e.nativeEvent.key === 'Enter') {
            handleSendMessage();
        }
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <ChatMessage
                        key={item.id}
                        message={item}
                        userId={userId}
                        contactName={contactName}
                        dashboardType="host"
                    />
                )}
                contentContainerStyle={styles.chatContainer}
                inverted={true}
            />

            <View style={styles.inputContainer}>
                {/* <Icon name="image" size={40} color="black" style={styles.icon} /> */}

                <ChatUploadAttachment
                    onUploadComplete={(fileUrl) =>
                        setUploadedFileUrls((prev) => [...prev, fileUrl])
                    }
                    iconStyle={styles.icon}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Write a message..."
                    value={newMessage}
                    onChangeText={setNewMessage}
                    onSubmitEditing={handleSendMessage}
                    onKeyPress={handleKeyUp}
                />
                {/* Uncomment to add a send button */}
                {/* <TouchableOpacity style={styles.sendButton}>
            <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity> */}
            </View>
        </View>

    );
};

// Styles
const styles = StyleSheet.create({
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

export default ChatScreen;


