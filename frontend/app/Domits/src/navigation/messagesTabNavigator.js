import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

import Inbox from '../screens/message/Inbox';

import { WebSocketProvider } from '../screens/message/context/webSocketContext';
import {styles} from './styles/messagesStackNavigatorStyles';

const MessagesTab = () => {
    const { user, userAttributes } = useAuth();
    const [userGroup, setUserGroup] = useState('');
    const [userId] = useState(userAttributes?.sub || '');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (user) {
            setUserGroup(userAttributes?.['custom:group'] || 'N/A');
        } else {
            setUserGroup('');
        }
    }, [user, userAttributes]);

    return (
        <SafeAreaView style={styles.tabAll} edges={['top']}>
            <View style={headerStyles.headerContainer}>
                <Text style={headerStyles.title}>Chats</Text>
                <TextInput
                    style={headerStyles.searchBar}
                    placeholder="Search chats..."
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>
            <View style={styles.screenContainer}>
                <Inbox userId={userId} dashboardType={userGroup} searchQuery={searchQuery} />
            </View>
        </SafeAreaView>
    );
};

const headerStyles = StyleSheet.create({
    headerContainer: {
        backgroundColor: 'white',
        paddingHorizontal: 15,
        paddingTop: 10,
        paddingBottom: 10,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 10,
        marginLeft: 5,
    },
    searchBar: {
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 10,
        fontSize: 16,
        color: '#000',
    },
});

export default MessagesTab;
