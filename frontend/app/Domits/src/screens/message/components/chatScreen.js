import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, TextInput, FlatList, Image, TouchableOpacity, Text } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import ChatMessage from './chatMessage';
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

    // Deduplicate messages by ID to prevent duplicate key errors
    const uniqueMessages = React.useMemo(() => {
        const messageMap = new Map();
        messages.forEach(msg => {
            if (msg.id && !messageMap.has(msg.id)) {
                messageMap.set(msg.id, msg);
            }
        });
        return Array.from(messageMap.values());
    }, [messages]);

    return (
        <View style={styles.container}>
            <FlatList
                data={uniqueMessages}
                keyExtractor={(item) => item.id || `${item.userId}-${item.createdAt}-${item.text}`}
                renderItem={({ item }) => (
                    <ChatMessage
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
                <TextInput
                    style={styles.input}
                    placeholder="Write a message..."
                    value={newMessage}
                    onChangeText={setNewMessage}
                    onSubmitEditing={handleSendMessage}
                    onKeyPress={handleKeyUp}
                />
                {newMessage.trim() && (
                    <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={handleSendMessage}
                    >
                        <MaterialIcons name="arrow-forward" size={20} color="white" />
                    </TouchableOpacity>
                )}
                {!newMessage.trim() && (
                    <TouchableOpacity style={styles.plusButtonContainer}>
                        <Text style={styles.plusButton}>+</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>

    );
};

export default ChatScreen;


