import { useState, useEffect, useContext } from 'react';
import { WebSocketContext } from '../../features/hostdashboard/hostmessages/context/webSocketContext';
import useFetchContacts from '../../features/hostdashboard/hostmessages/hooks/useFetchContacts';
import ContactItem from './ContactItem';
import '../../features/hostdashboard/hostmessages/styles/sass/contactlist/hostContactList.scss';
import { FaCog, FaSearch, FaBars, FaPlus } from 'react-icons/fa';
import AutomatedSettings from './AutomatedSettings';

const ContactList = ({ userId, onContactClick, message, dashboardType, isChatOpen = false }) => {
    const { contacts, pendingContacts, loading, setContacts } = useFetchContacts(userId, dashboardType);
    const [selectedContactId, setSelectedContactId] = useState(null);
    const [displayType, setDisplayType] = useState('contacts');
    const socket = useContext(WebSocketContext);
    const wsMessages = socket?.messages || [];
    const isHost = dashboardType === 'host';
    const [automatedSettings, setAutomatedSettings] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortAlphabetically, setSortAlphabetically] = useState(false);

    const labels = {
        contacts: 'Contacts',
        pending: 'Sent requests',
        noContacts: 'No contacts found.',
        noPending: 'No requests sent.'
    }

    const handleCreateTestContact = () => {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.background = 'rgba(0,0,0,0.5)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '10000';

        const modal = document.createElement('div');
        modal.style.background = '#fff';
        modal.style.padding = '16px';
        modal.style.borderRadius = '8px';
        modal.style.width = '420px';
        modal.style.maxWidth = '90vw';
        modal.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';

        modal.innerHTML = `
            <h3 style="margin:0 0 12px 0;">Add contact</h3>
            <label style="display:block;margin-bottom:6px;">Name</label>
            <input id="new-contact-name" type="text" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px;" placeholder="Contact name"/>
            <label style="display:block;margin-bottom:6px;">Profile image (PNG/JPG)</label>
            <input id="new-contact-file" type="file" accept="image/png, image/jpeg" style="width:100%;margin-bottom:12px;"/>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
                <button id="cancel-add-contact" style="padding:6px 10px;border:1px solid #ccc;border-radius:6px;background:#f6f6f6;">Cancel</button>
                <button id="save-add-contact" style="padding:6px 10px;border:1px solid #0D9813;border-radius:6px;background:#0D9813;color:#fff;">Add</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const removeModal = () => document.body.removeChild(overlay);

        modal.querySelector('#cancel-add-contact').onclick = removeModal;
        modal.querySelector('#save-add-contact').onclick = async () => {
            const nameInput = modal.querySelector('#new-contact-name');
            const fileInput = modal.querySelector('#new-contact-file');
            const name = (nameInput.value || '').trim();
            if (!name) { alert('Please enter a name'); return; }

            let profileImageUrl;
            const file = fileInput.files && fileInput.files[0];
            if (file) {
                // Read file as data URL so it immediately renders in the UI
                profileImageUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsDataURL(file);
                });
            }

            const id = `test-${Date.now()}`;
            const newContact = {
                userId: id,
                recipientId: id,
                givenName: name,
                profileImage: profileImageUrl,
                latestMessage: { text: 'Hello from test contact', createdAt: new Date().toISOString() },
            };
            setContacts(prev => [newContact, ...prev]);
            removeModal();
        };
    };

    useEffect(() => {
        if (wsMessages?.length === 0) return;
        setContacts(prevContacts => {
            const updatedContacts = [...prevContacts];
            wsMessages.forEach((msg) => {
                const contact = updatedContacts.find(c => c.recipientId === msg.userId || c.recipientId === msg.recipientId);
                if (contact) {
                    // Determine the display text based on message content
                    let displayText = msg.text;
                    if (msg.fileUrls && msg.fileUrls.length > 0) {
                        displayText = "attachment sent";
                    }
                    
                    contact.latestMessage = {
                        ...msg,
                        text: displayText
                    };
                }
            });
            return updatedContacts;
        });
    }, [wsMessages, setContacts]);

    useEffect(() => {
        if (!message) return;
        setContacts(prevContacts => {
            const updatedContacts = [...prevContacts];
            const index = updatedContacts.findIndex(c => c.recipientId === message.recipientId);
            if (index !== -1) {
                // Determine the display text based on message content
                let displayText = message.text;
                if (message.fileUrls && message.fileUrls.length > 0) {
                    displayText = "attachment sent";
                }
                
                updatedContacts[index] = {
                    ...updatedContacts[index],
                    latestMessage: { 
                        text: displayText, 
                        createdAt: message.createdAt,
                        fileUrls: message.fileUrls 
                    }
                };
            }
            updatedContacts.sort((a, b) => new Date(b.latestMessage?.createdAt || 0) - new Date(a.latestMessage?.createdAt || 0));
            return updatedContacts;
        });
    }, [message, setContacts]);

    let contactList = displayType === 'contacts' ? contacts : pendingContacts;

    if (searchTerm) {
        contactList = contactList.filter(contact =>
            contact.givenName?.toLowerCase().includes(searchTerm)
        );
    }

    if (sortAlphabetically) {
        contactList = [...contactList].sort((a, b) =>
            (a.givenName || '').localeCompare(b.givenName || '')
        );
    } else {
        contactList = [...contactList].sort((a, b) =>
            new Date(b.latestMessage?.createdAt || 0) - new Date(a.latestMessage?.createdAt || 0)
        );
    }

    const noContactsMessage = displayType === 'contacts' ? labels.noContacts : labels.noPending;

    const handleClick = (contactId, contactName, contactImage) => {
        setSelectedContactId(contactId);
        onContactClick?.(contactId, contactName, contactImage);
    };

    return (
        <div className={`${dashboardType}-contact-list-modal`}>
            <h3>Message dashboard</h3>
            <div style={{ marginTop: '-0.25rem' }}>
                <input
                    type="text"
                    placeholder="Search contacts"
                    className={`contact-search-input contact-search-under-title ${isChatOpen ? 'chat-open' : ''}`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
                    style={{ 
                        width: isChatOpen ? '80%' : '100%', 
                        maxWidth: isChatOpen ? '80%' : '100%',
                        borderRadius: '20px',
                        padding: '12px 16px',
                        border: '1px solid #ddd',
                        backgroundColor: '#fff',
                        fontSize: '14px',
                        outline: 'none',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                        e.target.style.borderColor = '#0D9813';
                        e.target.style.boxShadow = '0 4px 8px rgba(13, 152, 19, 0.2)';
                    }}
                    onBlur={(e) => {
                        e.target.style.borderColor = '#ddd';
                        e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                    }}
                />
            </div>

            <div className={`contact-list-toggle`}>
                <select
                    value={displayType}
                    onChange={(e) => setDisplayType(e.target.value)}
                    className="contact-dropdown"
                >
                    <option value="contacts">{labels.contacts}</option>
                    <option value="pendingContacts">{labels.pending}</option>
                </select>

                <div className="contact-list-side-buttons">
                    <FaBars className={`contact-list-side-button`} onClick={() => setSortAlphabetically(prev => !prev)} />
                    {isHost && (
                        <FaCog className={`contact-list-side-button`} onClick={() => setAutomatedSettings(true)} />
                    )}
                    <button className={`contact-list-side-button`} onClick={handleCreateTestContact} title="Create test contact">
                        <FaPlus />
                    </button>

                </div>



                {automatedSettings && (
                    <AutomatedSettings
                        setAutomatedSettings={setAutomatedSettings}
                        hostId={userId}
                    />
                )}


            </div>

            <ul className={`contact-list-list`}>
                {loading ? (
                    <p className={`contact-list-loading-text`}>Loading contacts...</p>
                ) : contactList.length === 0 ? (
                    <p className={`contact-list-empty-text`}>{noContactsMessage}</p>
                ) : (
                    contactList
                        .map((contact) => (
                            <li
                                key={contact.userId}
                                className={`contact-list-list-item ${displayType === 'pendingContacts' ? 'disabled' : ''}`}
                                onClick={() => displayType !== 'pendingContacts' && handleClick(contact.recipientId, contact.givenName, contact.profileImage)}
                            >
                                <ContactItem
                                    contact={contact}
                                    isPending={displayType === 'pendingContacts'}
                                    setContacts={setContacts}
                                    userId={userId}
                                    selected={selectedContactId === contact.recipientId}
                                    dashboardType={dashboardType}
                                />
                            </li>
                        ))
                )}
            </ul>
        </div>
    );
};

export default ContactList;
