import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

import Notifications from '../screens/message/notifications';
import InboxHost from '../screens/message/chatInboxHost';
import SupportHost from '../screens/message/supportHost';
import SupportGuest from '../screens/message/supportGuest';
import InboxGuest from '../screens/message/chatInboxGuest';

const MessagesTab = () => {
    const [activeTab, setActiveTab] = useState('Notifications');
    const { user, userAttributes } = useAuth();
    const [userGroup, setUserGroup] = useState('');

    useEffect(() => {
        if (user) {
            setUserGroup(userAttributes?.['custom:group'] || 'N/A');
        } else {
            setUserGroup('');
        }
    }, [user, userAttributes]);

    return (
        <View style={styles.tabAll}>
            <View style={styles.tabBar}>
                <TouchableOpacity onPress={() => setActiveTab('Notifications')}>
                    <Text style={[styles.tabText, activeTab === 'Notifications' && styles.activeTabText]}>
                        Notifications
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('Inbox')}>
                    <Text style={[styles.tabText, activeTab === 'Inbox' && styles.activeTabText]}>
                        Inbox
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('Support')}>
                    <Text style={[styles.tabText, activeTab === 'Support' && styles.activeTabText]}>
                        AI & Support
                    </Text>
                </TouchableOpacity>
            </View>
            <View style={styles.screenContainer}>
                {activeTab === 'Notifications' && <Notifications />}
                {activeTab === 'Inbox' && (userGroup === 'Host' ? <InboxHost /> : <InboxGuest />)}
                {activeTab === 'Support' && (userGroup === 'Host' ? <SupportHost /> : <SupportGuest />)}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    tabAll: {
        flex: 1,
        backgroundColor: 'white',
    },
    tabBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: 'white',
        paddingVertical: 10,
        marginTop: 75,
    },
    tabText: {
        fontSize: 16,
        color: 'black',
    },
    activeTabText: {
        color: '#0fa616',

    },
    screenContainer: {
        flex: 1,
        backgroundColor: 'white',
        padding: 10,
    },
});

export default MessagesTab;
