import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

const ChatInbox = () => {

  const contacts = [
    { id: '1', name: 'Rick', lastMessage: 'Hey, how are you?', time: '2:30 PM' },
    { id: '2', name: 'Ada', lastMessage: 'Let’s catch up tomorrow!', time: '1:15 PM' },
    { id: '3', name: 'Sven', lastMessage: 'Got it, thanks!', time: '12:45 PM' },
 
  ];

 
  const renderContact = ({ item }) => (
    <TouchableOpacity style={styles.contactItem}>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.lastMessage}>{item.lastMessage}</Text>
      </View>
      <Text style={styles.time}>{item.time}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.chatInboxContainer}>
      {contacts.length === 0 ? (
        <Text style={styles.noContactsText}>No contacts</Text>
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderContact}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  chatInboxContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  listContainer: {
    paddingVertical: 10,
  },
  noContactsText: {
    flex: 1,
    fontSize: 18,
    color: 'gray',
    textAlign: 'center',
    marginTop: 20,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
  },
  lastMessage: {
    fontSize: 14,
    color: 'gray',
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    color: 'gray',
  },
});

export default ChatInbox;
