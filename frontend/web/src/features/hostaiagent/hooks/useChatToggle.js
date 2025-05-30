import { useState, useEffect } from 'react';

const useChatToggle = (role, location) => {
    const [isChatOpen, setIsChatOpen] = useState(false);

    useEffect(() => {
        if (role === 'Host' && location.pathname === '/hostdashboard' && !sessionStorage.getItem('chatOpened')) {
            setIsChatOpen(true);
            sessionStorage.setItem('chatOpened', 'true');
        }
    }, [role, location.pathname]); // Only depends on role and path

    const toggleChat = () => setIsChatOpen((prev) => !prev);

    return { isChatOpen, toggleChat };
};

export default useChatToggle;
