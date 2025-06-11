import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import ContactItem from './components/contactItem';
import useFetchContacts from './Hooks/useFetchContacts';
import { WebSocketContext } from './context/webSocketContext';

import { styles } from './styles/inboxStyles';

const Inbox = ({ userId, onContactClick, message, dashboardType }) => {

    const navigation = useNavigation();
    const {
        contacts: hostContacts,
        loading: hostLoading,
        setContacts
    } = useFetchContacts(userId, 'host');

    const {
        contacts: guestContacts,
        loading: guestLoading,
    } = useFetchContacts(userId, 'guest');

    const contacts = [...hostContacts, ...guestContacts];
    const loading = hostLoading || guestLoading;
    const [selectedContactId, setSelectedContactId] = useState(null);

    const socket = useContext(WebSocketContext);
    const wsMessages = socket?.messages || [];

    useEffect(() => {
        if (wsMessages?.length === 0) return;
        setContacts(prevContacts => {
            const updatedContacts = [...prevContacts];
            wsMessages.forEach((msg) => {
                const contact = updatedContacts.find(c => c.recipientId === msg.userId || c.recipientId === msg.recipientId);
                if (contact) {
                    contact.latestMessage = msg;
                }
            });
            return updatedContacts;
        });
    }, [wsMessages, setContacts]);

    useEffect(() => {
        if (!message) return;
        setContacts(prevContacts => {
            const updatedContacts = [...prevContacts];
            const index = updatedContacts.findIndex(c => c.recipientId === message.recipientId);
            if (index !== -1) {
                updatedContacts[index] = {
                    ...updatedContacts[index],
                    latestMessage: { text: message.text, createdAt: message.createdAt }
                };
            }
            updatedContacts.sort((a, b) => new Date(b.latestMessage?.createdAt || 0) - new Date(a.latestMessage?.createdAt || 0));
            return updatedContacts;
        });
    }, [message, setContacts]);

    const handleClick = (userId, contactId, contactName) => {
        setSelectedContactId(contactId);
        onContactClick?.(contactId, contactName);
        navigation.navigate('CHAT_SCREEN', { userId, recipientId: contactId, contactName });
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            onPress={() => handleClick(userId, item.recipientId, item.givenName)}
            style={styles.listItem}
        >
            <ContactItem
                contact={item}
                setContacts={setContacts}
                userId={userId}
                selected={selectedContactId === item.recipientId}
                dashboardType={dashboardType}
            />
        </TouchableOpacity>
    );

    const sortedContacts = contacts.sort((a, b) =>
        new Date(b.latestMessage?.createdAt || 0) - new Date(a.latestMessage?.createdAt || 0)
    );

    const noContactsMessage = dashboardType === 'host' ? 'No clients yet' : 'No hosts yet';

    return (
        <View style={styles.container}>
            {loading ? (
                <ActivityIndicator size="large" color="green" />
            ) : sortedContacts.length === 0 ? (
                <Text style={styles.emptyText}>{noContactsMessage}</Text>
            ) : (
                <FlatList
                    data={sortedContacts}
                    keyExtractor={(item) => item.userId.toString()}
                    renderItem={renderItem}
                />
            )}
        </View>
    );
};

export default Inbox;
