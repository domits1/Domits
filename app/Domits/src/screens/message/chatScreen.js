import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Image } from 'react-native';
import Amplify from 'aws-amplify';
import { graphqlOperation } from '@aws-amplify/api-graphql';
import { API } from '@aws-amplify/api';
import * as queries from "../queries";
// import { format } from 'date-fns';
import { useRoute } from '@react-navigation/native';
import { generateClient } from 'aws-amplify/api';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';


const client = generateClient();


const ChatScreen = ({ }) => {
    const [messageText, setMessageText] = useState('');
    const [chatMessages, setChatMessages] = useState();
    const [loading, setLoading] = useState(false);
    const route = useRoute();
    const flatListRef = useRef();
    const [givenName, setGivenName] = useState(null);
    const { userId, recipientId, } = route.params;
    const navigation = useNavigation();

    useEffect(() => {
        fetchChats();
        console.log('contact', recipientId)
    }, [userId, recipientId]);
    if (givenName !== null) {
        navigation.setOptions({
            headerRight: () => (
                <Text style={styles.headerText}>{givenName || 'Loading...'}</Text>
            ),
        });
    }

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
                console.log('this is', givenName)
            } catch (error) {
                console.error('Error fetching guest info:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserInfo();
    }, [recipientId]);







    useEffect(() => {
        // Scroll to the bottom whenever the chatMessages are updated
        if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
        }
    }, [chatMessages]);

    const fetchChats = async () => {
        if (!recipientId || !userId) {
            console.error('Missing userId or recipientId');
            return;
        }

        setLoading(true); // Show loading spinner
        try {
            // Fetch sent messages
            const sentMessagesResponse = await client.graphql(graphqlOperation(queries.listChats, {
                filter: {
                    userId: { eq: userId },
                    recipientId: { eq: recipientId },
                },
            }));
            const sentMessages = sentMessagesResponse.data.listChats.items;

            // Fetch received messages
            const receivedMessagesResponse = await client.graphql(graphqlOperation(queries.listChats, {
                filter: {
                    userId: { eq: recipientId },
                    recipientId: { eq: userId },
                },
            }));
            const receivedMessages = receivedMessagesResponse.data.listChats.items;

            // Combine and sort messages
            const allSentChats = sentMessages.map((chat) => ({
                ...chat,
                isSent: true,
            }));
            const allReceivedChats = receivedMessages.map((chat) => ({
                ...chat,
                isSent: false,
            }));
            const allChats = [...allSentChats, ...allReceivedChats].sort(
                (a, b) => new Date(b.createdAt) - new Date(a.createdAt) // Change the order here
            );


            setChatMessages(allChats);
        } catch (error) {
            console.error('Error fetching chats:', error);
        } finally {
            setLoading(false); // Hide loading spinner
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
                    value={messageText}
                    onChangeText={setMessageText}
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


