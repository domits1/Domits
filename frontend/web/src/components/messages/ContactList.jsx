import { useState, useEffect, useContext, useMemo } from 'react';
import { WebSocketContext } from '../../features/hostdashboard/hostmessages/context/webSocketContext';
import useFetchContacts from '../../features/hostdashboard/hostmessages/hooks/useFetchContacts';
import ContactItem from './ContactItem';
import '../../features/hostdashboard/hostmessages/styles/sass/contactlist/hostContactList.scss';
import { FaCog, FaSearch, FaBars } from 'react-icons/fa';
import AutomatedSettings from './AutomatedSettings';

const ContactList = ({ userId, onContactClick, message, dashboardType }) => {
    const { contacts, pendingContacts, loading, setContacts } = useFetchContacts(userId, dashboardType);
    const [selectedContactId, setSelectedContactId] = useState(null);
    const [displayType, setDisplayType] = useState('contacts');
    const socket = useContext(WebSocketContext);
    const wsMessages = socket?.messages || [];
    const isHost = dashboardType === 'host';
    const [automatedSettings, setAutomatedSettings] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortAlphabetically, setSortAlphabetically] = useState(false);
    const [manualRecipientId, setManualRecipientId] = useState('');
    const [manualRecipientName, setManualRecipientName] = useState('');
    const [pairCode, setPairCode] = useState('');

    const localPairCode = useMemo(() => {
        try {
            const existing = window.localStorage.getItem('domits_pair_code');
            if (existing) return existing;
            const gen = Math.random().toString(36).substr(2, 6).toUpperCase();
            window.localStorage.setItem('domits_pair_code', gen);
            return gen;
        } catch (e) {
            return 'ABC123';
        }
    }, []);

    // Prefill helpers for local/test environments
    // Hard-wired defaults for local testing (host<->guest pair)
    const HARD_HOST_ID = process.env.REACT_APP_TEST_HOST_ID || '00000000-0000-4000-8000-000000000001';
    const HARD_GUEST_ID = process.env.REACT_APP_TEST_GUEST_ID || '00000000-0000-4000-8000-000000000002';
    const HARD_HOST_NAME = process.env.REACT_APP_TEST_HOST_NAME || 'Test Host';
    const HARD_GUEST_NAME = process.env.REACT_APP_TEST_GUEST_NAME || 'Test Guest';

    const testRecipientId = isHost ? HARD_GUEST_ID : HARD_HOST_ID;
    const testRecipientName = isHost ? HARD_GUEST_NAME : HARD_HOST_NAME;

    const labels = {
        contacts: 'Contacts',
        pending: 'Sent requests',
        noContacts: 'No contacts found.',
        noPending: 'No requests sent.'
    }

    useEffect(() => {
        if (wsMessages?.length === 0) return;
        setContacts(prevContacts => {
            const updatedContacts = [...prevContacts];
            wsMessages.forEach((msg) => {
                const contact = updatedContacts.find(c => c.recipientId === msg.userId || c.recipientId === msg.recipientId);
                if (contact) {
                    contact.latestMessage = msg;
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
                updatedContacts[index] = {
                    ...updatedContacts[index],
                    latestMessage: { text: message.text, createdAt: message.createdAt }
                };
            }
            updatedContacts.sort((a, b) => new Date(b.latestMessage?.createdAt || 0) - new Date(a.latestMessage?.createdAt || 0));
            return updatedContacts;
        });
    }, [message, setContacts]);

    // Auto prefill manual fields in dev/local when there are no contacts
    useEffect(() => {
        const currentListLength = (displayType === 'contacts' ? contacts.length : pendingContacts.length);
        if (currentListLength === 0 && !manualRecipientId) {
            const lastRecipient = window.localStorage.getItem('domits_last_manual_recipient');
            const lastName = window.localStorage.getItem('domits_last_manual_recipient_name');
            if (lastRecipient) {
                setManualRecipientId(lastRecipient);
                if (lastName) setManualRecipientName(lastName);
            } else if (window.location.hostname === 'localhost' && testRecipientId) {
                setManualRecipientId(testRecipientId);
                setManualRecipientName(testRecipientName);
            }
        }
    }, [displayType, contacts, pendingContacts, manualRecipientId, testRecipientId, testRecipientName]);

    // If we have a prefilled manual recipient and still no contacts, auto-open the chat
    useEffect(() => {
        const currentListLength = (displayType === 'contacts' ? contacts.length : pendingContacts.length);
        if (currentListLength === 0 && manualRecipientId && onContactClick) {
            setSelectedContactId(manualRecipientId);
            onContactClick(manualRecipientId, manualRecipientName || (isHost ? HARD_GUEST_NAME : HARD_HOST_NAME));
        }
    }, [manualRecipientId]);

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

    const handleClick = (contactId, contactName) => {
        setSelectedContactId(contactId);
        onContactClick?.(contactId, contactName);
    };

    return (
        <div className={`${dashboardType}-contact-list-modal`}>
            <h3>Message dashboard</h3>
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
                    <input
                        type="text"
                        placeholder=""
                        className="contact-search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
                    />
                    <FaBars className={`contact-list-side-button`} onClick={() => setSortAlphabetically(prev => !prev)} />
                    {isHost && (
                        <FaCog className={`contact-list-side-button`} onClick={() => setAutomatedSettings(true)} />
                    )}

                </div>



                {automatedSettings && (
                    <AutomatedSettings
                        setAutomatedSettings={setAutomatedSettings} />
                )}


            </div>

            {/* Always show quick start/join panel */}
            <div style={{
                display: 'grid',
                gap: 8,
                padding: 8,
                border: '1px dashed #d9d9d9',
                borderRadius: 8,
                maxWidth: 360,
                marginTop: 8,
                marginBottom: 8
            }}>
                <label style={{ fontWeight: 600 }}>Start a new chat</label>
                <div style={{ fontSize: 12, color: '#555' }}>Option A: Pairing code (local demo)</div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input
                        value={pairCode}
                        onChange={(e) => setPairCode(e.target.value.toUpperCase())}
                        placeholder="Enter code (e.g., ABC123)"
                        className="contact-search-input"
                        style={{ flex: 1 }}
                    />
                    <button
                        onClick={() => {
                            if (!pairCode) return;
                            handleClick(`pair:${pairCode}`, `Room ${pairCode}`);
                        }}
                        className="contact-list-side-button"
                        style={{ padding: '6px 12px', borderRadius: 6 }}
                    >
                        Join
                    </button>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#555' }}>Your code:</span>
                    <code style={{ background: '#f6f6f6', padding: '2px 6px', borderRadius: 4 }}>{localPairCode}</code>
                </div>
                <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
                    Share this code with the other side on this device to chat locally.
                </div>
                <div style={{ height: 12 }} />
                <div style={{ fontSize: 12, color: '#555' }}>Option B: Direct user ID</div>
                <input
                    value={manualRecipientId}
                    onChange={(e) => setManualRecipientId(e.target.value)}
                    placeholder={isHost ? 'Guest user ID' : 'Host user ID'}
                    className="contact-search-input"
                />
                <input
                    value={manualRecipientName}
                    onChange={(e) => setManualRecipientName(e.target.value)}
                    placeholder="Display name"
                    className="contact-search-input"
                />
                <button
                    onClick={() => {
                        if (!manualRecipientId) return;
                        window.localStorage.setItem('domits_last_manual_recipient', manualRecipientId);
                        window.localStorage.setItem('domits_last_manual_recipient_name', manualRecipientName || 'Conversation');
                        handleClick(manualRecipientId, manualRecipientName || 'Conversation');
                    }}
                    className="contact-list-side-button"
                    style={{ justifySelf: 'start', padding: '6px 12px', borderRadius: 6 }}
                >
                    Open chat
                </button>
                {testRecipientId && (
                    <button
                        onClick={() => {
                            setManualRecipientId(testRecipientId);
                            setManualRecipientName(testRecipientName);
                        }}
                        className="contact-list-side-button"
                        style={{ justifySelf: 'start', padding: '6px 12px', borderRadius: 6 }}
                    >
                        Use test account
                    </button>
                )}
            </div>

            <ul className={`contact-list-list`}>
                {loading ? (
                    <p className={`contact-list-loading-text`}>Loading contacts...</p>
                ) : contactList.length === 0 ? (
                    <div><p className={`contact-list-empty-text`}>{noContactsMessage}</p></div>
                ) : (
                    contactList
                        .map((contact) => (
                            <li
                                key={contact.userId}
                                className={`contact-list-list-item ${displayType === 'pendingContacts' ? 'disabled' : ''}`}
                                onClick={() => displayType !== 'pendingContacts' && handleClick(contact.recipientId, contact.givenName)}
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
