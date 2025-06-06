const profileImage = require('../pictures/domits-logo.jpg');
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';


const ContactItem = ({ contact, isPending, selected, dashboardType }) => {
    const isGuest = dashboardType === 'guest';

    let subtitle = 'No message history yet';
    if (contact.latestMessage?.text) {
        subtitle = contact.latestMessage.text;
    } else if (contact.latestMessage?.fileUrls?.length === 1) {
        subtitle = '(1) Image';
    } else if (contact.latestMessage?.fileUrls?.length > 1) {
        subtitle = `(${contact.latestMessage.fileUrls.length}) Images`;
    }

    return (
        <View style={[styles.container, selected && styles.selected]}>
            <View style={styles.imageContainer}>
                <Image source={profileImage} style={styles.profileImage} />
            </View>

            <View style={styles.textContainer}>
                <Text style={styles.fullName}>{contact.givenName}</Text>
                {!isPending && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 0,
        paddingVertical: 20,
        paddingHorizontal: 10,
        borderBottomWidth: 0.5,
        borderColor: '#e0e0e0',
    },
    
   
    profileImage: {
        width: 35,
        height: 35,
        borderRadius: 25,
        marginRight: 15,
        backgroundColor: '#e0e0e0',
    },
    textContainer: {
        flex: 1,
    },
    fullName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    subtitle: {
        fontSize: 15,
        color: '#555',
        marginTop: 3,

    },
});

export default ContactItem;