import React, { useEffect, useState, useRef } from "react";
import { generateClient } from 'aws-amplify/api';
import { fetchUserAttributes, getCurrentUser } from '@aws-amplify/auth';
import * as mutations from "./mutations";
import * as queries from "./queries";
import * as subscriptions from './subscriptions';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, FlatList, KeyboardAvoidingView, Platform } from 'react-native';

const client = generateClient();

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

export function Messages({ route, navigation }) {
  const [chats, setChats] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [chatUsers, setChatUsers] = useState([]);
  const [channelUUID, setChannelUUID] = useState(null);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [user, setUser] = useState(null);

  const chatContainerRef = useRef(null);

  const recipientEmail = route.params?.email;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        const attributes = await fetchUserAttributes(currentUser);
        if (attributes && attributes.email) {
          setUser({ email: attributes.email });
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    if (recipientEmail) {
      handleUserClick(recipientEmail);
    }
  }, [recipientEmail]);

  useEffect(() => {
    if (user && user.email) {
      fetchChatUsers();
    }
  }, [user]);

  useEffect(() => {
    if (channelUUID) {
      const subscription = client.graphql({
        query: subscriptions.onCreateChat,
        variables: { channelID: channelUUID }
      }).subscribe({
        next: ({ value }) => {
          const newChat = value.data.onCreateChat;
          setChats(prevChats => [...prevChats, { ...newChat, isSent: newChat.email === user.email }]);
        },
        error: error => {
          console.warn('Subscription error:', error);
        }
      });

      // Cleanup subscription on component unmount
      return () => subscription.unsubscribe();
    }
  }, [channelUUID, user]);

  const generateChannelName = (userEmail, recipientEmail) => {
    const sortedEmails = [userEmail, recipientEmail].sort();
    return sortedEmails.join('_');
  };

  const handleUserClick = async (email) => {
    const selectedUser = { email: email };
    setSelectedUser(selectedUser);
    setIsChatVisible(true);

    if (!user || !user.email) {
      return;
    }

    const userEmail = user.email;
    const channelName = generateChannelName(userEmail, email);
    setChannelUUID(channelName);

    fetchChats(email, channelName);

    if (chatContainerRef.current) {
      chatContainerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const fetchChats = async (recipientEmail, channelName) => {
    try {
      const sentMessagesResponse = await client.graphql({
        query: queries.listChats,
        variables: {
          filter: {
            email: { eq: user.email },
            recipientEmail: { eq: recipientEmail }
          }
        }
      });

      const receivedMessagesResponse = await client.graphql({
        query: queries.listChats,
        variables: {
          filter: {
            email: { eq: recipientEmail },
            recipientEmail: { eq: user.email }
          }
        }
      });

      const sentMessages = sentMessagesResponse.data.listChats.items.map(chat => ({
        ...chat,
        isSent: true
      })).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      const receivedMessages = receivedMessagesResponse.data.listChats.items.map(chat => ({
        ...chat,
        isSent: false
      })).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      const allChats = [...sentMessages, ...receivedMessages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      setChats(allChats);
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };


  const sendMessage = async () => {
    if (!newMessage.trim()) {
      return;
    }
    if (!selectedUser || !channelUUID || !user || !user.email) {
      return;
    }

    try {
      const messagePayload = {
        text: newMessage.trim(),
        email: user.email,
        recipientEmail: selectedUser.email,
        isRead: false,
        createdAt: new Date().toISOString(),
        channelID: channelUUID
      };

      const response = await client.graphql({
        query: mutations.createChat,
        variables: {
          input: messagePayload,
        },
      });

      setNewMessage('');

      setChats(prevChats => [...prevChats, { ...messagePayload, isSent: true }]);

      const updatedChatUsers = chatUsers.map(chatUser => {
        if (chatUser.email === selectedUser.email) {
          return {
            ...chatUser,
            lastMessageTimestamp: new Date().getTime(),
          };
        }
        return chatUser;
      });
      setChatUsers(updatedChatUsers);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleBackToUsers = () => {
    setSelectedUser(null);
    setIsChatVisible(false);
  };

  const fetchChatUsers = async () => {
    try {
      const response = await client.graphql({ query: queries.listChats });
      const allChats = response.data.listChats.items;

      const uniqueUsers = [...new Set(allChats.flatMap(chat => [chat.email, chat.recipientEmail]))];

      const filteredUsersData = uniqueUsers
        .filter(email => email !== user.email)
        .map(email => {
          const userChats = allChats.filter(chat => chat.email === email || chat.recipientEmail === email);
          const lastMessage = userChats.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
          return {
            email,
            lastMessageTimestamp: lastMessage ? new Date(lastMessage.createdAt).getTime() : 0,
            lastMessage: lastMessage ? lastMessage.text : '',
          };
        })
        .filter(userData => {
          return allChats.some(chat =>
            (chat.email === user.email && chat.recipientEmail === userData.email) ||
            (chat.recipientEmail === user.email && chat.email === userData.email)
          );
        })
        .sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);

      setChatUsers(filteredUsersData);
    } catch (error) {
      console.error('Error fetching chat users:', error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.chat}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      {isChatVisible ? (
        <View style={styles.chat__container}>
          <TouchableOpacity onPress={handleBackToUsers} style={styles.chat__backButton}>
            <Text style={styles.chat__backButtonText}>Back to Users</Text>
          </TouchableOpacity>
          <View style={styles.chat__message} ref={chatContainerRef}>
            <View style={styles.chat__figure}>
              <View style={styles.chat__aside}>
                <View style={styles.chat__pfpSecond}></View>
                <View style={styles.chat__list}>
                  <Text style={styles.chat__name}>{selectedUser ? selectedUser.email : ''}</Text>
                  <Text style={styles.chat__listP}>3rd all-time booker</Text>
                  <Text style={styles.chat__listP}> 2 adults, 2 kids</Text>
                  <Text style={styles.chat__listP}> Kinderhuissingel 6k</Text>
                  <Text style={styles.chat__listP}> 21-12-2023 / 28-12-2023</Text>
                  <Text style={styles.chat__listP}> paid with mastercard</Text>
                </View>
              </View>
            </View>
            <FlatList
              data={chats}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <View style={[styles.chat__bubble, item.isSent ? styles.chat__bubbleSent : styles.chat__bubbleReceived]}>
                  <Text style={styles.chat__bubbleText}>{item.text}</Text>
                </View>
              )}
            />
            <View style={styles.chat__inputContainer}>
              <TextInput
                style={styles.chat__input}
                value={newMessage}
                onChangeText={(text) => setNewMessage(text)}
                placeholder="Type your message..."
                onSubmitEditing={() => sendMessage()}
              />
              <TouchableOpacity onPress={() => sendMessage()} style={styles.chat__sendButton}>
                <Text style={styles.chat__sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.chat__people}>
        <FlatList
          data={chatUsers}
          keyExtractor={(item) => item.email}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.chat__peopleContainer} onPress={() => handleUserClick(item.email)}>
              <View style={styles.chat__pfp}></View>
              <View style={styles.chat__body}>
                <Text style={styles.chat__name}>{item.email}</Text>
                <Text style={styles.chat__text}>{item.lastMessage}</Text>
              </View>
              <View style={styles.chat__time}>
                <Text>{new Date(item.lastMessageTimestamp).toLocaleDateString()}</Text>
              </View>
            </TouchableOpacity>
          )}
        />

        </View>
      )}
    </KeyboardAvoidingView>
  );
}

export default Messages;

const styles = StyleSheet.create({
  chat: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  chat__container: {
    flex: 1,
    padding: 20,
  },
  chat__message: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    flex: 1,
  },
  chat__figure: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  chat__aside: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chat__pfpSecond: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ddd',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chat__list: {
    justifyContent: 'flex-start',
    flexDirection: 'column',
  },
  chat__name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  chat__listP: {
    fontSize: 14,
    color: '#666',
  },
  chat__inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  chat__input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    flex: 1,
  },
  chat__sendButton: {
    backgroundColor: '#57af5b',
    borderRadius: 8,
    padding: 10,
    marginLeft: 10,
    alignItems: 'center',
  },
  chat__sendButtonText: {
    color: '#ffffff',
    fontSize: 16,
  },
  chat__people: {
    flex: 1,
    padding: 20,
  },
  chat__peopleContainer: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  chat__pfp: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ddd',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chat__body: {
    flex: 1,
  },
  chat__name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  chat__text: {
    fontSize: 14,
    color: '#666',
  },
  chat__time: {
    fontSize: 12,
    color: '#999',
  },
  chat__backButton: {
    backgroundColor: '#6200ea',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  chat__backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
  },
  chat__bubble: {
    padding: 10,
    borderRadius: 8,
    marginVertical: 5,
    maxWidth: '80%',
  },
  chat__bubbleSent: {
    backgroundColor: '#57af5b',
    alignSelf: 'flex-end',
  },
  chat__bubbleReceived: {
    backgroundColor: '#b187cb',
    alignSelf: 'flex-start',
  },
  chat__bubbleText: {
    fontSize: 16,
  },
});
