import { useState, useEffect, useContext, useMemo } from 'react';
import { WebSocketContext } from '../../features/hostdashboard/hostmessages/context/webSocketContext';
import useFetchContacts from '../../features/hostdashboard/hostmessages/hooks/useFetchContacts';
import ContactItem from './ContactItem';
import '../../features/hostdashboard/hostmessages/styles/sass/contactlist/hostContactList.scss';
import { FaCog, FaSearch, FaBars, FaPlus } from 'react-icons/fa';
import AutomatedSettings from './AutomatedSettings';

const ContactList = ({ userId, onContactClick, message, dashboardType, showPending = true }) => {
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
    const [showCreateTest, setShowCreateTest] = useState(false);
    const [testName, setTestName] = useState('Test Host');
    const [testAvatarDataUrl, setTestAvatarDataUrl] = useState('');
    // pairing/direct UI removed per requirements

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

    const handleClick = (contactId, contactName, profileImage) => {
        setSelectedContactId(contactId);
        onContactClick?.(contactId, contactName, profileImage);
    };

    return (
        <div className={`${dashboardType}-contact-list-modal`}>
            <h3>Message dashboard</h3>
            <div className="dashboard-stats">
                <div className="stat-item">
                    <span className="stat-number">{contacts.length}</span>
                    <span className="stat-label">Active conversations</span>
                </div>
                {isHost && (
                    <div className="stat-item">
                        <span className="stat-number">{pendingContacts.length}</span>
                        <span className="stat-label">Pending requests</span>
                    </div>
                )}
            </div>
            <div className={`contact-list-toggle`}>
                <select
                    value={displayType}
                    onChange={(e) => setDisplayType(e.target.value)}
                    className="contact-dropdown"
                >
                    <option value="contacts">{labels.contacts}</option>
                    {showPending && <option value="pendingContacts">{labels.pending}</option>}
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
                    <FaPlus className={`contact-list-side-button`} title="Create test contact" onClick={() => setShowCreateTest(true)} />

                </div>



                {automatedSettings && (
                    <AutomatedSettings
                        setAutomatedSettings={setAutomatedSettings} />
                )}

                {showCreateTest && (
                    <div className="automated-settings-modal">
                        <div className="top-bar">
                            <h2>Create test contact</h2>
                            <button onClick={() => setShowCreateTest(false)}>Close</button>
                        </div>
                        <div className="settings-body" style={{ display: 'block', padding: '1rem' }}>
                            <div style={{ marginBottom: '0.5rem' }}>
                                <label>Name</label>
                                <input type="text" value={testName} onChange={(e) => setTestName(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
                            </div>
                            <div style={{ marginBottom: '0.75rem' }}>
                                <label>Profile image (optional)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files && e.target.files[0];
                                        if (!file) { setTestAvatarDataUrl(''); return; }
                                        const reader = new FileReader();
                                        reader.onload = () => setTestAvatarDataUrl(reader.result);
                                        reader.readAsDataURL(file);
                                    }}
                                    style={{ display: 'block', marginTop: '6px' }}
                                />
                                {testAvatarDataUrl && (
                                    <img src={testAvatarDataUrl} alt="Preview" style={{ marginTop: '8px', width: '64px', height: '64px', objectFit: 'cover', borderRadius: '50%', border: '1px solid #e5e7eb' }} />
                                )}
                            </div>
                            <button onClick={() => {
                                const id = `test-${Date.now()}`;
                                const newContact = {
                                    userId: id,
                                    recipientId: id,
                                    givenName: testName || 'Test Contact',
                                    accoImage: null,
                                    profileImage: testAvatarDataUrl || null,
                                    latestMessage: { text: 'Test contact created', createdAt: new Date().toISOString() },
                                };
                                setContacts(prev => [newContact, ...prev]);
                                setShowCreateTest(false);
                                setTestName('Test Host');
                                setTestAvatarDataUrl('');
                            }} className="dropdownLoginButton">Create</button>
                        </div>
                    </div>
                )}


            </div>

            {/* Optional quick start/join panel (hidden by default) */}
            {/* Quick start removed per requirements */}

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
