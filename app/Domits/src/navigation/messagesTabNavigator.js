import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import Notifications from '../screens/message/notifications';
import Inbox from '../screens/message/chatInbox';
import Support from '../screens/message/support';

const MessagesTab = () => {
    const [activeTab, setActiveTab] = useState('Notifications');

    return (
        <View style={styles.tabAll}>
            {/* Tab Buttons */}
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

            {/* Active Tab Content */}
            <View style={styles.screenContainer}>
                {activeTab === 'Notifications' && <Notifications />}
                {activeTab === 'Inbox' && <Inbox />}
                {activeTab === 'Support' && <Support />}
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
