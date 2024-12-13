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
    // setLoading(true);
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
      // console.log('all contacts: ', contacts)

    } catch (error) {
      console.error('Error fetching host contacts:', error);
    } finally {
      // setLoading(false);
    }
  };
  const fetchOrderedChatUsers = async () => {
    try {
      const response = await fetch('https://97dww4xncg.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Read-ContactsSorted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) throw new Error('Failed to fetch chat users');
      const data = await response.json();
      setChatUsers(data);
      setItemsDisplay(data);
      console.log(data)
    } catch (error) {
      console.error('Error fetching ordered chat users:', error);
    }
  };

  const fetchLatestChat = async (recipientId) => {
    if (!recipientId) {
      console.error('No valid recipient ID provided');
      return;
    }
    // setLoading(true); // Show loading spinner
    try {
      const response = await fetch('https://tgkskhfz79.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Read-NewMessages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          recipientId: recipientId,
        }),
      });

      const rawResponse = await response.text();
      const result = JSON.parse(rawResponse);

      if (response.ok) {
        const latestChat = result;

        setChatMessages((prevChats) => {
          const updatedChats = { ...prevChats };
          // Update the recipient's chat messages with the latest chat
          updatedChats[recipientId] = [latestChat, ...(prevChats[recipientId] || [])];
          updatedChats[recipientId].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort by date

          return updatedChats;
        });

        // Update the last message information for the user
        setChatUsers((prevUsers) => {
          return prevUsers.map((user) => {
            if (user.userId === recipientId) {
              return {
                ...user,
                lastMessage: latestChat.text || "No messages yet",
                lastMessageTimestamp: latestChat.createdAt || 0,
              };
            }
            return user;
          });
        });

      } else {
        console.error("Error fetching latest chat:", result.body);
      }
    } catch (error) {
      console.error('Error fetching latest chat:', error);
    } finally {
      // setLoading(false); // Hide loading spinner
    }
  };
  // useEffect(() => {
  //   const subscription = client.graphql(
  //     graphqlOperation(subscriptions.onCreateChat)
  //   ).subscribe({
  //     next: ({ }) => {
  //       fetchLatestChat();
  //     },
  //     error: error => console.error("Subscription error:", error),
  //   });
  //   return () => subscription.unsubscribe();
  // }, []);

  const generateChannelName = (userId, recipientId) => {
    const sortedIds = [userId, recipientId].sort();
    return sortedIds.join('_');
  };

  useEffect(() => {
    if (userId) {
      fetchHostContacts();
      fetchOrderedChatUsers();
      // fetchChatUsers();
    }
  }, [userId]);

  useEffect(() => {
    if (userId && contacts.length > 0) {
      const filteredContacts = contacts.filter(contact => contact.userId !== userId);
      const filteredContactIds = filteredContacts.map(contact => contact.userId);

      const fetchAllChats = async () => {
        try {
          setLoading(true); // Set loading true while chats are being fetched

          // Use Promise.all to fetch the latest chat for each contact concurrently
          await Promise.all(filteredContactIds.map(contactId => fetchLatestChat(contactId)));

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
