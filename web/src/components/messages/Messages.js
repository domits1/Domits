import React, { useEffect, useState } from "react";

const MessagesLayout = ({
    userId,
    ContactListComponent,
    ChatScreenComponent,
    BookingTabComponent,
    showPages = false,
    PagesComponent = null,
    dashboardType,
}) => {
    const [selectedContactId, setSelectedContactId] = useState(null);
    const [selectedContactName, setSelectedContactName] = useState(null);
    const [message, setMessage] = useState([]);
    const [screenWidth, setScreenWidth] = useState(window.innerWidth);
    const isMobile = screenWidth < 768;
    const isTablet = screenWidth >= 768 && screenWidth < 1440;

    useEffect(() => {
        const handleResize = () => setScreenWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const handleContactClick = (contactId, contactName) => {
        setSelectedContactId(contactId);
        setSelectedContactName(contactName);
    };

    const handleBackToContacts = () => {
        setSelectedContactId(null);
        setSelectedContactName(null);
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
            <main className="page-body">
                {userId ? (
                    <div className={`${dashboardType}-chat-components`}>
                        {showPages && PagesComponent && (
                            <div className="chat-side">
                                <PagesComponent />
                            </div>
                        )}
                        {showContactList && (
                            <ContactListComponent
                                userId={userId}
                                onContactClick={handleContactClick}
                                message={message}
                            />
                        )}
                        {isMobile && selectedContactId && (
                            <button onClick={handleBackToContacts} className="ContactsBack-button">
                                ← Back to contacts
                            </button>
                        )}
                        {showChatScreen && (
                            <ChatScreenComponent
                                userId={userId}
                                handleContactListMessage={handleContactListMessage}
                                contactId={selectedContactId}
                                contactName={selectedContactName}
                                onBack={isTablet ? handleBackToContacts : null}
                            />
                        )}
                        {showChatScreen && (
                            <div className={`${dashboardType}-booking-tab-overlay`}>
                                <BookingTabComponent
                                    userId={userId}
                                    contactId={selectedContactId}
                                    contactName={selectedContactName}
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <div>Loading user info...</div>
                )}
            </main>
    );
};

export default MessagesLayout;
