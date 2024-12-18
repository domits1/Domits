import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';


const ContactItem = ({ item }) => {
    const [fullName, setFullName] = useState(null);
    const [givenName, setGivenName] = useState(null);
    const [userId, setUserId] = useState(null);
    const { contactId, lastMessage } = item;
    const [loading, setLoading] = useState(true);

    // console.log("Rendering ContactItem for contact:", contactId, "Last message:", lastMessage);

    useEffect(() => {


        const fetchUserInfo = async () => {
            try {

                const requestData = { OwnerId: item.userId };

                const response = await fetch(`https://gernw0crt3.execute-api.eu-north-1.amazonaws.com/default/GetUserInfo`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData),
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch user information');
                }

                const responseData = await response.json();
                const parsedData = JSON.parse(responseData.body)[0];
                const attributes = parsedData.Attributes.reduce((acc, attribute) => {
                    acc[attribute.Name] = attribute.Value;
                    return acc;
                }, {});

                // const fullName = `${attributes['given_name']} ${attributes['family_name']}`;
                // setFullName(fullName);
                setGivenName(attributes['given_name']);
                setUserId(parsedData.Attributes[2].Value);
            } catch (error) {
                console.error('Error fetching guest info:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserInfo();
    }, [item]);

    if (loading) {
        // Show a loading spinner while data is being fetched
        return (
            <View style={styles.content}>
                <ActivityIndicator size="large" color="grey" marginTop="3" />
            </View>
        );
    }
    // console.log('fullname:', fullName)
    return (
        <View style={styles.content}>
            <Image
                source={require('../../screens/pictures/domits-logo.jpg')}
                style={styles.profileImage}
                resizeMode="cover"
            />
            <View style={styles.textContainer}>
                <Text style={styles.fullName}>{givenName}</Text>
                <Text style={styles.subtitle} numberOfLines={1} 
                // ellipsizeMode="tail"
                >
                    {lastMessage}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    content: {
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },


});

export default ContactItem;
