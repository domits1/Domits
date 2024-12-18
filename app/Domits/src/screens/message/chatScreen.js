import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Image } from 'react-native';
import { graphqlOperation } from '@aws-amplify/api-graphql';
import { useRoute } from '@react-navigation/native';
import { generateClient } from 'aws-amplify/api';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import * as subscriptions from '../subscriptions';

const client = generateClient();

const ChatScreen = ({ }) => {
    const [newMessage, setNewMessage] = useState('');
    const [chatMessages, setChatMessages] = useState();
    const [loading, setLoading] = useState(false);
    const route = useRoute();
    const flatListRef = useRef();
    const [givenName, setGivenName] = useState(null);
    const { userId, recipientId, } = route.params;
    const navigation = useNavigation();
    const [channelUUID, setChannelUUID] = useState(null);
    const [showDate, setShowDate] = useState(false);
    const [lastMessageDate, setLastMessageDate] = useState(null);


    const generateChannelName = (userId, recipientId) => {
        const sortedIds = [userId, recipientId].sort();
        return sortedIds.join('_');
    };

    useEffect(() => {
        const channelName = generateChannelName(recipientId, recipientId);
        setChannelUUID(channelName);
        fetchChats();
    }, [userId, recipientId]);

    useEffect(() => {

        const fetchUserInfo = async () => {
            try {

                const requestData = { OwnerId: recipientId };

                const response = await fetch(`https://gernw0crt3.execute-api.eu-north-1.amazonaws.com/default/GetUserInfo`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData),
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch user information');
                }
                const responseData = await response.json();
                const parsedData = JSON.parse(responseData.body)[0];
                const attributes = parsedData.Attributes.reduce((acc, attribute) => {
                    acc[attribute.Name] = attribute.Value;
                    return acc;
                }, {});

                setGivenName(attributes['given_name']);

            } catch (error) {
                console.error('Error fetching guest info:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchUserInfo();
    }, [recipientId]);

    useEffect(() => {
        if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
        }
    }, [chatMessages]);

    useEffect(() => {
        const subscription = client.graphql(
            graphqlOperation(subscriptions.onCreateChat)
        ).subscribe({
            next: ({ }) => {
                // fetchLatestChat(recipientId);
                fetchChats(recipientId)
            },
            error: error => console.error("Subscription error:", error),
        });
        return () => subscription.unsubscribe();
    }, []);

    const fetchChats = async () => {
        if (!recipientId || !userId) {
            console.error('Missing userId or recipientId');
            return;
        }

        const recipientIdToSend = recipientId;
        try {
            const response = await fetch('https://8pwu9lnge0.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Read-MessagesHistory', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    recipientId: recipientIdToSend,
                }),
            });

            const rawResponse = await response.text();
            const result = JSON.parse(rawResponse);

            if (response.ok) {
                const allChats = result;

                allChats.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setChatMessages(allChats);
            } else {
                console.error("Error fetching messages:", result.body);
            }
        } catch (error) {
            console.error('Error fetching chats:', error);
        } finally {
            setLoading(false); 
        }
    };

    const fetchLatestChat = async () => {
        if (!recipientId || !userId) {
            console.error('Missing userId or recipientId');
            return;
        }

        const recipientIdToSend = recipientId;
        try {
            const response = await fetch('https://tgkskhfz79.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Read-NewMessages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    recipientId: recipientIdToSend,
                }),
            });
            const rawResponse = await response.text();
            const result = JSON.parse(rawResponse);

            if (response.ok) {
                const latestChat = result;

                setChatMessages((prevChats) => {
                    const updatedChats = [latestChat, ...prevChats];
                    updatedChats.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    return updatedChats;
                });
            } else {
                console.error("Error fetching latest chat:", result.body);
            }
        } catch (error) {
            console.error('Error fetching latest chat:', error);
        } finally {
            setLoading(false);
        }
    };



    const sendMessage = async () => {
        const recipientIdToSend = recipientId;
        try {
            const messageData = {
                text: newMessage.trim(),
                userId: userId,
                recipientId: recipientIdToSend,
                channelId: channelUUID,
            };
            const response = await fetch('https://qkptcbb445.execute-api.eu-north-1.amazonaws.com/ChatSendMessageFunction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: newMessage.trim(),
                    userId: userId,
                    recipientId: recipientIdToSend,
                    channelId: channelUUID,
                }),
            });

            const result = await response.json();

            if (response.ok) {
                setNewMessage('');
                setShowDate(true);
                setLastMessageDate(new Date());

                await fetchLatestChat(recipientIdToSend);
            } else {
                console.error("Error sending message:", result);
            }

        } catch (error) {
            console.error("Error sending message:", error);
        }
    };


    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    useEffect(() => {
        if (channelUUID) {
            console.log('Channel UUID is set:', channelUUID);
        } else {
            console.log('Channel UUID is not set or invalid.');
        }
    }, [channelUUID]);

    const handleKeyUp = (e) => {
        if (e.nativeEvent.key === 'Enter') {
            sendMessage();
        }
    };


    return (
        <View style={styles.container}>
            {/* Chat messages */}
            <FlatList
                data={chatMessages}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View
                        style={[
                            styles.messageContainer,
                            item.isSent ? styles.messageRight : styles.messageLeft,
                        ]}
                    >
                        {!item.isSent && (
                            <View style={styles.messageContent}>

                                <View style={styles.senderHeader}>
                                    <Image
                                        source={require('../../screens/pictures/domits-logo.jpg')}
                                        style={styles.senderImage}
                                    />
                                    <Text style={styles.senderName}>{givenName}</Text>
                                    <Text style={styles.senderMessageDate}>
                                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}
                                    </Text>
                                </View>

                                <Text style={styles.senderMessageText}>{item.text}</Text>
                            </View>
                        )}
                        {item.isSent && (
                            <View style={styles.messageContent}>
                                <View style={styles.youHeader}>
                                    <Text style={styles.youMessageDate}>
                                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}
                                    </Text>
                                    <Text style={styles.youLabel}>YOU</Text>
                                    <Image
                                        source={require('../../screens/pictures/domits-logo.jpg')}
                                        style={styles.youImage}
                                    />
                                </View>

                                <Text style={styles.youMessageText}>{item.text}</Text>

                            </View>
                        )}
                    </View>
                )}
                contentContainerStyle={styles.chatContainer}
                inverted={true} // To ensure messages are displayed from the bottom
            />

            {/* Input field for new message */}
            <View style={styles.inputContainer}>
                <Icon name="image" size={40} color="black" style={styles.icon} />
                <TextInput
                    style={styles.input}
                    placeholder="Write a message..."
                    value={newMessage}
                    onChangeText={setNewMessage}
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
        backgroundColor: '#f9f9f9',
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


