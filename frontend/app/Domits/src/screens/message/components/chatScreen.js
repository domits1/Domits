import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, TextInput, FlatList, Image, TouchableOpacity, Text } from 'react-native';
import { v4 as uuidv4 } from 'uuid';


import ChatMessage from './chatMessage';
import ChatUploadAttachment from './chatUploadAttachment';
import { WebSocketContext } from '../context/webSocketContext';

import useFetchMessages from '../Hooks/useFetchMessages';
import { useSendMessage } from '../Hooks/useSendMessage';
import { styles } from '../styles/chatScreenStyles';

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
                    alert(`"Error sending: ${response.error || 'Try again later.'}`);
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
                console.error('Unexpected error sending:', error);
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
                <TouchableOpacity style={styles.sendButton}>
                    <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
            </View>
        </View>

    );
};

export default ChatScreen;


