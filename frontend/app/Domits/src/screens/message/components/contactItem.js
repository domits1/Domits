const profileImage = require('../../pictures/domits-logo.jpg');

import React from 'react';
import { View, Text, Image, } from 'react-native';
import { styles } from '../styles/contactItemStyles';

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

export default ContactItem;