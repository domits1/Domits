import React, { useEffect, useState } from "react";
import { UserProvider } from "../../features/hostdashboard/hostmessages/context/AuthContext";
import { WebSocketProvider } from "../../features/hostdashboard/hostmessages/context/webSocketContext";
import { useAuth } from "../../features/hostdashboard/hostmessages/hooks/useAuth";

import ContactList from "./ContactList";
import ChatScreen from "./ChatScreen";
import BookingTab from "./BookingTab";

import "../../features/hostdashboard/hostmessages/styles/sass/hostMessages.scss";


const Messages = ({ dashboardType }) => {
    return (
        <UserProvider>
            <MessagesContent dashboardType={dashboardType} />
        </UserProvider>
    );
};


const MessagesContent = ({ dashboardType }) => {
    const { userId } = useAuth();
    const [selectedContactId, setSelectedContactId] = useState(null);
    const [selectedContactName, setSelectedContactName] = useState(null);
    const [selectedContactImage, setSelectedContactImage] = useState(null);
    const [message, setMessage] = useState([]);
    // Only track breakpoint categories, not exact width to avoid re-renders on zoom
    const getBreakpoint = (width) => {
        if (width < 768) return 'mobile';
        if (width >= 768 && width < 1440) return 'tablet';
        return 'desktop';
    };
    
    const [breakpoint, setBreakpoint] = useState(getBreakpoint(window.innerWidth));
    const isMobile = breakpoint === 'mobile';
    const isTablet = breakpoint === 'tablet';

    useEffect(() => {
        let timeoutId;
        const handleResize = () => {
            // Debounce to reduce frequency of checks
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                const newBreakpoint = getBreakpoint(window.innerWidth);
                // Only update state if breakpoint category actually changed
                setBreakpoint(prev => prev !== newBreakpoint ? newBreakpoint : prev);
            }, 150);
        };
        window.addEventListener("resize", handleResize);
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    const handleContactClick = (contactId, contactName, contactImage) => {
        setSelectedContactId(contactId);
        setSelectedContactName(contactName);
        setSelectedContactImage(contactImage || null);
    };

    const handleBackToContacts = () => {
        setSelectedContactId(null);
        setSelectedContactName(null);
    };

    const handleCloseChat = (contactId = null) => {
        if (!contactId || contactId === selectedContactId) {
            setSelectedContactId(null);
            setSelectedContactName(null);
            setSelectedContactImage(null);
        }
    };

    const handleContactListMessage = (sentMessage) => {
        setMessage(sentMessage);
    };

    const showContactList =
        isMobile ? !selectedContactId :
            isTablet ? !selectedContactId :
                true;

    const showChatScreen =
        isMobile ? !!selectedContactId :
            isTablet ? !!selectedContactId :
                true;
    return (
        <div className={`${dashboardType}-dashboard-page-body`}>
            <WebSocketProvider userId={userId}>
                {userId ? (
                    <div className={`${dashboardType}-chat-components`}>
                        {showContactList && (
                            <ContactList
                                userId={userId}
                                onContactClick={handleContactClick}
                                onCloseChat={handleCloseChat}
                                message={message}
                                dashboardType={dashboardType}
                                isChatOpen={!!selectedContactId}
                                activeContactId={selectedContactId}
                            />
                        )}
                        {isMobile && selectedContactId && (
                            <button onClick={handleBackToContacts} className="ContactsBack-button">
                                ← Back to contacts
                            </button>
                        )}
                        {showChatScreen && (
                            <ChatScreen
                                userId={userId}
                                handleContactListMessage={handleContactListMessage}
                                contactId={selectedContactId}
                                contactName={selectedContactName}
                                contactImage={selectedContactImage}
                                onBack={isTablet ? handleBackToContacts : null}
                                dashboardType={dashboardType}

                            />
                        )}
                        {showChatScreen && (
                            <div className={`${dashboardType}-booking-tab-overlay`}>
                                <BookingTab
                                    userId={userId}
                                    contactId={selectedContactId}
                                    contactName={selectedContactName}
                                    dashboardType={dashboardType}

                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <div>Loading user info...</div>
                )}
            </WebSocketProvider>
        </div>
    );
};

export default Messages;
