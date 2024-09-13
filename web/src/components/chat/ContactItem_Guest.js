import React, { useEffect, useState } from 'react';
import DateFormatterDD_MM_YYYY from "../utils/DateFormatterDD_MM_YYYY";
import styles from "./ChatPage.module.css";
import spinner from "../../images/spinnner.gif";

const ContactItem = ({ item, type, index, selectUser, selectedUser, unreadMessages }) => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const requestData = {
                    UserId: item.userId
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
                setUser(parsedData.Attributes[2].Value);
            } catch (error) {
                console.error('Error fetching guest info:', error);
            }
        };

        fetchUserInfo();
    }, [item]);

    if (user) {
        if (type === 'My contacts') {
            return (
                <div className={`${styles.displayItem} ${(selectedUser === user) ? styles.selectedUser : ''}`}
                     onClick={() => selectUser(index, user)}>
                    {user}
                </div>
            );
        } else {
            return (
                <div className={styles.displayItem} key={index}>
                    {user}
                </div>
            );
        }
    } else {
        return (
            <div>
                <img src={spinner} alt='spinner' style={{maxWidth: '50%', maxHeight: '50%'}}/>
            </div>
        );
    }
};

export default ContactItem;
