import React, { useState, useEffect } from 'react';
import profileImage from '../domits-logo.jpg';

const ContactItem = ({ contact, currentUserId }) => {
    const [givenName, setGivenName] = useState(null);
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                if (contact.userId === currentUserId) {
                    console.log("Skipping API call for logged-in user:", currentUserId);
                    setLoading(false);
                    return;
                }

                const requestData = { OwnerId: contact.userId };
                const response = await fetch('https://gernw0crt3.execute-api.eu-north-1.amazonaws.com/default/GetUserInfo', {
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

                setGivenName(attributes['given_name']);
                setUserId(parsedData.Attributes[2].Value);
            } catch (error) {
                console.error('Error fetching user info:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserInfo();
    }, [contact]);

    if (loading) {
        return (
            <div className="contact-item-content">
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="contact-item-content">
            <img src={profileImage} alt="Profile" className="contact-item-profile-image" />
            <div className="contact-item-text-container">
                <p className="contact-item-full-name">{givenName}</p>
                <p className="contact-item-subtitle">Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text </p>
            </div>
        </div>
    );
};

export default ContactItem;
