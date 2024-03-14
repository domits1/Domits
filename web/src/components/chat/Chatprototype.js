import React, { useEffect, useState } from "react";
import "./chatprototype.css";
import img1 from './image22.png';
import heart from './Icon.png';
import trash from './Icon-1.png';
import smile from './smile.png';
import users from './users.png';
import home from './home.png';
import calendar from './calendar.png';
import card from './card.png';
import django from './django.png';
import jan from './jan.png';
import eye from './eye.png';
import alert from './alert.png';

import { useNavigate } from 'react-router-dom';
import { API, graphqlOperation } from "aws-amplify";
import { withAuthenticator } from "@aws-amplify/ui-react";
import * as mutations from "../../graphql/mutations";
import * as queries from "../../graphql/queries";

function showMessages() {
    var screenWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;

    if (screenWidth < 1277) {
        var chatPeople = document.querySelector('.chat__people');
        var chatMessage = document.querySelector('.chat__message');

        chatPeople.style.display = 'none';
        chatMessage.style.display = 'block';
    }
}

const Chat = ({ user }) => {
    const [chats, setChats] = useState([]);
    const [newMessage, setNewMessage] = useState('');

    useEffect(() => {
        fetchChats();
    }, []);

    const fetchChats = async () => {
        try {
            const allChats = await API.graphql(graphqlOperation(queries.listChats));
            setChats(allChats.data.listChats.items);
        } catch (error) {
            console.error("Error fetching chats:", error);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim()) return;
        try {
            await API.graphql({
                query: mutations.createChat,
                variables: {
                    input: {
                        text: newMessage.trim(),
                        email: user.attributes.email,
                    },
                },
            });
            setNewMessage('');
            fetchChats();
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    return (
        // Your JSX code here, with the merged content and structure.
        // Note: Make sure to include all static UI elements from the `acceptance` branch code,
        // and integrate the dynamic parts related to chat functionality from the `chat` branch.
    );
}

export default withAuthenticator(Chat);
