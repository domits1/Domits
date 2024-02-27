export function useChatBackend(user, signOut) {
    const [chats, setChats] = React.useState([]);
    const [recipientEmail, setRecipientEmail] = React.useState("");
    const [recentMessageEmail, setRecentMessageEmail] = React.useState("");
    const [showJoinButton, setShowJoinButton] = React.useState(false);
    const [showConfirmedConnection, setShowConfirmedConnection] = React.useState(false);
    const [showAlert, setShowAlert] = React.useState(false);
    const [notificationMessage, setNotificationMessage] = React.useState("");
    const navigate = useNavigate();

    const handleSendMessage = async (text) => {
        const members = [user.attributes.email, recipientEmail];
        await API.graphql({
            query: mutations.createChat,
            variables: {
                input: { text, email: user.attributes.email, members, sortKey: members.sort().join("#") },
            },
        });
    };

    const handleReceivedMessage = (receivedChat) => {
        if (receivedChat.members.includes(user.attributes.email)) {
            setChats((prev) => [...prev, receivedChat]);
            setRecentMessageEmail(receivedChat.email);
            if (receivedChat.email) setShowJoinButton(true);
        }
    };

    const handleStartNewChat = () => {
        setRecipientEmail(prompt("Enter the email of the person you want to chat with:"));
        setShowAlert(true);
    };

    const handleAlertInputChange = (e) => setRecipientEmail(e.target.value);

    const handleAlertConfirm = () => {
        if (recipientEmail) {
            handleSendMessage("Hello, let's chat!");
            setShowAlert(false);
            setShowJoinButton(false);
            setShowConfirmedConnection(true);
            setNotificationMessage(`${recentMessageEmail} joined the chat`);
            navigate(`/chat`);
        }
    };

    const handleAlertCancel = () => {
        setShowAlert(false);
        setRecipientEmail("");
    };

    const handleJoinChat = () => {
        const members = [user.attributes.email, recentMessageEmail];
        setRecipientEmail(recentMessageEmail);
        setRecentMessageEmail("");
        setShowJoinButton(false);
        setShowConfirmedConnection(true);
        setNotificationMessage(`${recentMessageEmail} joined the chat`);
    };

    return {
        chats, setChats, recipientEmail, showJoinButton, setShowJoinButton, showConfirmedConnection,
        showAlert, notificationMessage, handleStartNewChat, handleSendMessage, handleAlertInputChange,
        handleAlertConfirm, handleAlertCancel, handleJoinChat, recentMessageEmail, handleReceivedMessage,
        signOut,
    };
}
