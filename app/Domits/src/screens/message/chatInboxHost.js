import React, { useEffect, useState, useRef } from "react";
import Amplify from 'aws-amplify';
import { graphqlOperation } from '@aws-amplify/api-graphql';
import { API } from '@aws-amplify/api';
import { listChats } from '../queries.js';
import { generateClient } from 'aws-amplify/api';
import * as mutations from "../mutations";
import * as queries from "../queries";
import * as subscriptions from '../subscriptions';
import { onCreateChat } from '../subscriptions.js';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import ContactItem from '../../components/chat/contactItem_host';
import { useAuth } from '../../context/AuthContext';
import awsconfig from '../../aws-exports.js';
import { useNavigation } from '@react-navigation/native';

// console.log('AWS Config:', awsconfig);
const client = generateClient();

// console.log("graphqlOperation:", graphqlOperation);

const InboxHost = ({ user }) => {
  const [chatUsers, setChatUsers] = useState([]);
  const { isAuthenticated, userAttributes, checkAuth } = useAuth();
  // const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingContacts, setPendingContacts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [itemsDisplay, setItemsDisplay] = useState([]);
  const userId = userAttributes?.sub;
  const navigation = useNavigation();
  const [chatMessages, setChatMessages] = useState({});

  const fetchHostContacts = async () => {
    setLoading(true);
    try {
      const requestData = {
        hostID: userId
      };
      const response = await fetch(`https://d1mhedhjkb.execute-api.eu-north-1.amazonaws.com/default/FetchContacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });
      if (!response.ok) {
        throw new Error('Failed to fetch host information');
      }
      const responseData = await response.json();
      const JSONData = JSON.parse(responseData.body);
      setContacts(JSONData.accepted);
      console.log('all contacts: ', contacts)

    } catch (error) {
      console.error('Error fetching host contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChatUsers = async () => {
    if (!userId) return;
    try {

      const response = await client.graphql(graphqlOperation(queries.listChats));

      const allChats = response.data.listChats.items;

      // console.log("All Chats Fetched:", allChats);

      const uniqueUsers = [...new Set(allChats.flatMap(chat => [chat.userId, chat.recipientId]))]
        .filter(id => id && id !== userId && id !== '7e50fbfa-3b06-486d-a96c-21a3a93b1647' && id !== '383e96b7-7cd1-4377-83a4-5454ed9c9374');

      const usersWithData = [];

      uniqueUsers.forEach(id => {
        const userChats = allChats.filter(chat =>
          (chat.userId === id && chat.recipientId === userId) ||
          (chat.recipientId === id && chat.userId === userId)
        );

        if (userChats.length > 0) {
          const lastMessageTimestamp = Math.max(...userChats.map(chat => new Date(chat.createdAt).getTime()));
          usersWithData.push({
            userId: id,
            lastMessageTimestamp
          });
        }
      });

      const filteredUsersData = usersWithData.sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
      setChatUsers(filteredUsersData);
      setItemsDisplay(filteredUsersData);
      console.log('fecthchat: ', chatUsers);
      console.log('itemsdispl', itemsDisplay);
      console.log('userid:', userId);
    } catch (error) {
      console.error("Error fetching chat users:", error);
    }
  };
  const fetchChats = async (recipientId) => {
    if (!recipientId) {
      console.error('No valid recipient ID provided');
      return;
    }

    setLoading(true); // Show loading spinner
    try {
      const sentMessagesResponse = await client.graphql(graphqlOperation(queries.listChats, {
        filter: {
          userId: { eq: userId },
          recipientId: { eq: recipientId },
        },
      }));
      const sentMessages = sentMessagesResponse.data.listChats.items;

      const receivedMessagesResponse = await client.graphql(graphqlOperation(queries.listChats, {
        filter: {
          userId: { eq: recipientId },
          recipientId: { eq: userId },
        },
      }));

      const receivedMessages = receivedMessagesResponse.data.listChats.items;

      const allMessages = [...sentMessages, ...receivedMessages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      const lastMessage = allMessages.length > 0
        ? (allMessages[allMessages.length - 1].text || "No messages yet")
        : "No messages yet";

      console.log(`Fetched Messages for ${recipientId}:`, allMessages);

      setChatMessages(prevChats => ({
        ...prevChats,
        [recipientId]: allMessages, 
      }));

      setChatUsers(prevUsers => {
        const updatedUsers = prevUsers.map(user => {
          if (user.userId === recipientId) {
            return {
              ...user,
              lastMessage: lastMessage,
              lastMessageTimestamp: allMessages[allMessages.length - 1]?.createdAt || 0,
            };
          }
          return user;
        });
        return updatedUsers;
      });

    } catch (error) {
      console.error(`Error fetching chats for recipientId ${recipientId}:`, error);
    } finally {
      setLoading(false); // Hide loading spinner
    }
  };


  useEffect(() => {
    const subscription = client.graphql(graphqlOperation(onCreateChat)).subscribe({
      next: ({ value }) => {
        const newMessage = value.data.onCreateChat;
        const { userId: messageUserId, recipientId, text } = newMessage;

        // Only update if the message is for the current user or a contact
        if (
          (messageUserId === userId && recipientId !== userId) ||
          (recipientId === userId && messageUserId !== userId)
        ) {
          setChatMessages(prevChats => {
            const updatedChats = { ...prevChats };
            if (updatedChats[recipientId]) {
              updatedChats[recipientId].lastMessage = text;
            } else {
              updatedChats[recipientId] = { lastMessage: text };
            }
            return updatedChats;
          });
        }
      },
      error: (err) => console.error('Subscription error:', err),
    });

    return () => subscription.unsubscribe();
  }, [userId]);

  const generateChannelName = (userId, recipientId) => {
    const sortedIds = [userId, recipientId].sort();
    return sortedIds.join('_');
  };

  useEffect(() => {
    if (userId) {
      fetchHostContacts();
      fetchChatUsers();
    }
  }, [userId]);

  useEffect(() => {
    if (userId && contacts.length > 0) {
      const filteredContacts = contacts.filter(contact => contact.userId !== userId);
      const filteredContactIds = filteredContacts.map(contact => contact.userId);

      // Fetch chats for each contact
      // filteredContactIds.forEach(contactId => {
      //   fetchChats(contactId);
      // });
      const fetchAllChats = async () => {
        try {
            setLoading(true); // Set loading true while chats are being fetched

            // Use Promise.all to fetch chats for all contacts concurrently
            await Promise.all(filteredContactIds.map(contactId => fetchChats(contactId)));

        } catch (error) {
            console.error('Error fetching chats:', error);
        } finally {
            setLoading(false); // Set loading false once all chats are fetched
        }
    };

    fetchAllChats();
    }
  }, [userId, contacts]);

  useEffect(() => {
    setItemsDisplay(chatUsers)

  }, [chatUsers]);

  // useEffect(() => {
  //   console.log('Updated chatUsers:', chatUsers);
  // }, [chatUsers]);

  const handleUserClick = (contactUserId) => {
    navigation.navigate('ChatScreen', { userId, recipientId: contactUserId });
  };

  return (

    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="grey" />
      ) : (
        <FlatList
          data={itemsDisplay}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => {
            const lastMessage = item.lastMessage || "No messages yet";
            return (
              <TouchableOpacity onPress={() => handleUserClick(item.userId)} style={styles.contactItem}>
                <ContactItem item={{ userId: item.userId, contactId: item.contactId, lastMessage, }} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>

  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
  },
  displayBody: {
    padding: 10,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  spinnerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default InboxHost;
