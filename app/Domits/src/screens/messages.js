import React, { useEffect, useState, useRef } from "react";
import { generateClient } from 'aws-amplify/api';
import * as mutations from "./mutations";
import * as queries from "./queries";
import { View, Text, ScrollView, Image, TextInput, TouchableOpacity, FlatList, StyleSheet, Dimensions } from 'react-native';

const client = generateClient();

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

const vw = (percentage) => {
  return (windowWidth * percentage) / 100;
};

const vh = (percentage) => {
  return (windowHeight * percentage) / 100;
};

export function Messages() {
  const [chats, setChats] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showDate, setShowDate] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [recipientEmail, setRecipientEmail] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [chatUsers, setChatUsers] = useState([]);
  const [channelUUID, setChannelUUID] = useState(null);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [user, setUser] = useState({ attributes: { email: 'jedar54396@acuxi.com' } }); // Replace with actual user fetching logic

  const chatContainerRef = useRef(null);

  const handleUserClick = (email) => {
    const user = chatUsers.find((user) => user.email === email);
    setSelectedUser(user);
    setIsChatVisible(true);
    // Optionally, scroll to the chat container
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleBackToUsers = () => {
    setSelectedUser(null);
    setIsChatVisible(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    try {
      const messagePayload = {
        text: newMessage.trim(),
        email: user.attributes.email,
        recipientEmail: selectedUser.email,
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      console.log("Attempting to send message with:", messagePayload);

      const response = await client.graphql({
        query: mutations.createChat,
        variables: {
          input: messagePayload,
        },
      });

      setNewMessage('');
      console.log("Message sent successfully:", response);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      const users = await fetchChatUsers(user);
      setChatUsers(users);
    };

    fetchUsers();
  }, [user]);

  const fetchChatUsers = async (user) => {
    try {
      const response = await client.graphql({ query: queries.listChats });
      console.log("GraphQL response:", response); // Debug log
      const allChats = response.data.listChats.items;

      // Create a set to track unique users
      const uniqueUsers = new Set();

      allChats.forEach(chat => {
        if (chat.email === user.attributes.email) {
          uniqueUsers.add(chat.recipientEmail);
        } else if (chat.recipientEmail === user.attributes.email) {
          uniqueUsers.add(chat.email);
        }
      });

      // Convert set to an array
      const filteredUsersData = Array.from(uniqueUsers).map(email => {
        const userChats = allChats.filter(chat => chat.email === email || chat.recipientEmail === email);
        const lastMessageTimestamp = Math.max(...userChats.map(chat => new Date(chat.createdAt).getTime()));
        return {
          email,
          lastMessageTimestamp,
        };
      }).sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);

      return filteredUsersData;
    } catch (error) {
      console.error("Error fetching chat users:", error);
      return [];
    }
  };

  return (
    <View style={styles.chat}>
      {isChatVisible ? (
        <View style={styles.chat__container}>
          <TouchableOpacity onPress={handleBackToUsers} style={styles.chat__backButton}>
            <Text style={styles.chat__backButtonText}>Back to Users</Text>
          </TouchableOpacity>
          <View style={styles.chat__message} ref={chatContainerRef}>
            <View style={styles.chat__figure}>
              <View style={styles.chat__aside}>
                <View style={styles.chat__pfpSecond}>
                  {/* <Image source={require('./path/to/img1')} style={styles.chatPfpImg}/> */}
                </View>
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
            <TextInput
              style={styles.chat__input}
              value={newMessage}
              onChangeText={(text) => setNewMessage(text)}
              placeholder="Type your message..."
              onSubmitEditing={() => sendMessage()}
            />
            <TouchableOpacity onPress={() => sendMessage()}>
              <Text>Send</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.chat__nav}>
            <View style={styles.chat__controls}>
              <TouchableOpacity></TouchableOpacity>
              <TouchableOpacity></TouchableOpacity>
            </View>
            <View style={styles.chat__buttonWrapper}>
              <TouchableOpacity style={styles.chat__buttonFile}>
                <Text>add files</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.chat__buttonReview}>
                <Text>Send review link</Text>
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
              <TouchableOpacity style={styles.chat__user} onPress={() => handleUserClick(item.email)}>
                <View style={styles.chat__wrapper}>
                  <Text style={styles.chat__name}>{item.email}</Text>
                  {/* Optionally display last message preview */}
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

export default Messages;


const styles = StyleSheet.create({
  chat: {
      flex: 1,
      backgroundColor: '#f5f5f5',
  },
  chat__headerWrapper: {
      padding: 20,
      backgroundColor: '#6200ea',
      alignItems: 'center',
  },
  h2: {
      fontSize: 24,
      color: '#ffffff',
  },
  chat__container: {
      flex: 1,
  },
  chat__message: {
      backgroundColor: '#ffffff',
      borderRadius: 8,
      padding: 15,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
      height: 550,
  },
  chat__figure: {
      flexDirection: 'row',
      marginBottom: 300,
  },
  chat__aside: {
      flexDirection: 'row',
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
  chatPfpImg: {
      width: '100%',
      height: '100%',
      borderRadius: 25,
  },
  chat__list: {
      justifyContent: 'flex-start',
      flexDirection: 'row',
      width: '100%',
      flexWrap: 'wrap',
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
  chat__input: {
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 8,
      padding: 10,
      marginTop: 10,
      fontSize: 16,
  },
  chat__sendButton: {
      backgroundColor: '#6200ea',
      borderRadius: 8,
      padding: 10,
      alignItems: 'center',
      marginTop: 10,
  },
  chat__sendButtonText: {
      color: '#ffffff',
      fontSize: 16,
  },
  chat__nav: {
      flexDirection: 'row',
      justifyContent: 'space-between',
  },
  chat__controls: {
      flexDirection: 'row',
  },
  chat__buttonWrapper: {
      flexDirection: 'row',
  },
  chat__buttonFile: {
      backgroundColor: '#0D9813',
      borderRadius: 8,
      padding: 10,
      marginRight: 10,
  },
  chat__buttonReview: {
      backgroundColor: '#49146A',
      borderRadius: 8,
      padding: 10,
  },
  chat__buttonText: {
      color: '#ffffff',
      fontSize: 14,
  },
  chat__people: {
      flex: 1,
  },
  chat__user: {
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
  chat__img: {
      width: '100%',
      height: '100%',
      borderRadius: 25,
  },
  chat__wrapper: {
      flex: 1,
  },
  chat__backButton: {
      backgroundColor: '#6200ea',
      borderRadius: 8,
      padding: 10,
      margin: 10,
  },
  chat__backButtonText: {
      color: '#ffffff',
      fontSize: 16,
      textAlign: 'center',
  },
});