import React, { useEffect, useState } from 'react';
import DateFormatterDD_MM_YYYY from "../../utils/DateFormatterDD_MM_YYYY";
import styles from "./ChatPage.module.css";
import spinner from "../../../images/spinnner.gif";

const ContactItem = ({ item, type, index, acceptOrDenyRequest, selectUser, selectedUser, unreadMessages, setPendingRequest, setContactModalOpen }) => {
    const [user, setUser] = useState(null);
    const [FullName, setFullName] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUserInfo = async () => {
            setIsLoading(true);
            try {
                const requestData = {
                    OwnerId: item.userId
                };
                const response = await fetch(`https://gernw0crt3.execute-api.eu-north-1.amazonaws.com/default/GetUserInfo`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData)
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
                const fullName = `${attributes['given_name']} ${attributes['family_name']}`;
                setFullName(fullName);
                setUser(parsedData.Attributes[2].Value);
            } catch (error) {
                console.error('Error fetching guest info:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUserInfo();
    }, [item]);

    if (isLoading) {
        return (
            <div>
                <img src={spinner} alt='spinner' style={{maxWidth: '50%', maxHeight: '50%'}}/>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    switch (type) {
        case 'My contacts':
            return (
                <div className={`${styles.displayItem} ${(selectedUser === user) ? styles.selectedUser : ''}`} onClick={() => selectUser(index, FullName)}>
                    <div className={styles.fullName}>{FullName}</div>
                    {unreadMessages[item.userId] > 0 && (
                        <div>
                            {unreadMessages[item.userId] > 9 ? '9+' : unreadMessages[item.userId]} new messages
                        </div>
                    )}
                </div>
            );
        case 'Pending contacts':
            return (
                <div className={`${styles.displayItem} ${styles.pendingContactItem}`}>
                    {FullName}
                    <div className={styles.horizontalButtonBox}>
                        <button className={`${styles.accept} ${styles.roundButton}`}
                                onClick={() => acceptOrDenyRequest('accepted', item.ID, item.userId)}
                        >✓</button>
                        <button className={`${styles.deny} ${styles.roundButton}`}
                                onClick={() => {
                                    setPendingRequest({ status: 'denied', id: item.ID, origin: item.userId });
                                    setContactModalOpen(true);
                                }}
                        >x</button>
                    </div>
                </div>
            );
        default:
            console.log('Unhandled type:', type);
            return null;
    }
};

export default ContactItem;
