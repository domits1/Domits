import { useState, useEffect, useContext } from 'react';
import { WebSocketContext } from '../../features/hostdashboard/hostmessages/context/webSocketContext';
import useFetchContacts from '../../features/hostdashboard/hostmessages/hooks/useFetchContacts';
import ContactItem from './ContactItem';
import '../../features/hostdashboard/hostmessages/styles/sass/contactlist/hostContactList.scss';
import { FaCog, FaPlus, FaSearch } from 'react-icons/fa';
import AutomatedSettings from './AutomatedSettings';
import NewContactModal from './NewContactModal';

const ContactList = ({ userId, onContactClick, message, dashboardType }) => {
    const { contacts, pendingContacts, loading, setContacts } = useFetchContacts(userId, dashboardType);
    const [selectedContactId, setSelectedContactId] = useState(null);
    const [displayType, setDisplayType] = useState('contacts');
    const socket = useContext(WebSocketContext);
    const wsMessages = socket?.messages || [];
    const isHost = dashboardType === 'host';
    const [automatedSettings, setAutomatedSettings] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortAlphabetically] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

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

    // Merge locally created contacts from localStorage once on mount
    useEffect(() => {
        const storageKey = `domits_local_contacts_${userId}_${dashboardType}`;
        try {
            const raw = localStorage.getItem(storageKey);
            if (!raw) return;
            const localContacts = JSON.parse(raw);
            if (!Array.isArray(localContacts)) return;
            setContacts(prev => {
                const existingIds = new Set(prev.map(c => c.recipientId || c.userId || c.id));
                const merged = [
                    ...prev,
                    ...localContacts.filter(c => !existingIds.has(c.recipientId || c.userId || c.id))
                ];
                return merged;
            });
        } catch (e) {
            console.error('Failed to parse local contacts', e);
        }
        // eslint-disable-next-line
    }, []);

    let contactList = displayType === 'contacts' ? contacts : pendingContacts;


    // Search by keyword across guest name, property title, latest message, and booking dates
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        contactList = contactList.filter(contact => {
            const nameMatch = (contact.givenName || '').toLowerCase().includes(term);
            const propertyMatch = (contact.propertyTitle || '').toLowerCase().includes(term);
            const latestText = contact.latestMessage?.text || '';
            const messageMatch = latestText.toLowerCase().includes(term);
            // Allow searching by formatted dates
            const arrival = contact.arrivalDate ? new Date(contact.arrivalDate) : null;
            const departure = contact.departureDate ? new Date(contact.departureDate) : null;
            const dateTokens = [];
            if (arrival) {
                dateTokens.push(arrival.toLocaleDateString().toLowerCase());
                dateTokens.push(arrival.toISOString().slice(0, 10));
            }
            if (departure) {
                dateTokens.push(departure.toLocaleDateString().toLowerCase());
                dateTokens.push(departure.toISOString().slice(0, 10));
            }
            const dateMatch = dateTokens.some(d => d.includes(term));
            return nameMatch || propertyMatch || messageMatch || dateMatch;
        });
    }

    // Removed property/guest/date filters for a simpler sidebar

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

    const handleClick = (contact) => {
        const contactId = contact.recipientId;
        setSelectedContactId(contactId);
        onContactClick?.(contactId, contact.givenName, contact.profileImage || null);
    };

    const handleCreateContact = (newContact) => {
        const storageKey = `domits_local_contacts_${userId}_${dashboardType}`;
        setContacts(prev => [newContact, ...prev]);
        try {
            const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const updated = [newContact, ...existing];
            localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch (e) {
            console.error('Failed to store local contact', e);
        }
    };

    return (
        <div className={`${dashboardType}-contact-list-modal`}>
            <h3>Message dashboard</h3>
            <div className="contact-search-bar">
                <FaSearch className="contact-search-icon" />
                <input
                    type="text"
                    placeholder="Search contacts"
                    className="contact-search-input-wide"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
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
                    <button className="new-contact-button" onClick={() => setShowCreateModal(true)} title="Create new contact">
                        <FaPlus />
                    </button>
                    {isHost && (
                        <FaCog className={`contact-list-side-button`} onClick={() => setAutomatedSettings(true)} />
                    )}

                </div>



                {automatedSettings && (
                    <AutomatedSettings
                        setAutomatedSettings={setAutomatedSettings} />
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
                                key={contact.recipientId || contact.userId || contact.id}
                                className={`contact-list-list-item ${displayType === 'pendingContacts' ? 'disabled' : ''}`}
                                onClick={() => displayType !== 'pendingContacts' && handleClick(contact)}
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
            <NewContactModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreate={handleCreateContact}
                userId={userId}
                dashboardType={dashboardType}
            />
        </div>
    );
};

export default ContactList;
