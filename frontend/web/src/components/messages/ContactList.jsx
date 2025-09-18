import { useState, useEffect, useContext } from 'react';
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
    const [selectedHostId, setSelectedHostId] = useState('');
    const [selectedPropertyId, setSelectedPropertyId] = useState('');

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

    const baseList = displayType === 'contacts' ? contacts : pendingContacts;

    // Build filter sources
    const hostOptions = Array.from(
        new Map(baseList.map(c => [c.recipientId, { id: c.recipientId, name: c.givenName || 'Unknown' }])).values()
    );
    const propertyOptions = Array.from(
        new Map(baseList.filter(c => c.propertyId).map(c => [c.propertyId, { id: c.propertyId, name: c.propertyTitle || c.propertyId }])).values()
    );

    let contactList = baseList;

    if (searchTerm) {
        contactList = contactList.filter(contact => {
            const nameHit = contact.givenName?.toLowerCase().includes(searchTerm);
            const msgText = contact.latestMessage?.text?.toLowerCase() || '';
            const messageHit = msgText.includes(searchTerm);
            const propertyHit = (contact.propertyTitle || '').toLowerCase().includes(searchTerm);
            return nameHit || messageHit || propertyHit;
        });
    }

    if (selectedHostId) {
        contactList = contactList.filter(c => c.recipientId === selectedHostId);
    }

    if (selectedPropertyId) {
        contactList = contactList.filter(c => c.propertyId === selectedPropertyId);
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
                        placeholder="Search by name, message, property"
                        className="contact-search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
                    />
                    <select
                        className="contact-filter-select"
                        value={selectedHostId}
                        onChange={(e) => setSelectedHostId(e.target.value)}
                        title={isHost ? 'Filter by guest' : 'Filter by host'}
                    >
                        <option value="">{isHost ? 'All guests' : 'All hosts'}</option>
                        {hostOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.name}</option>
                        ))}
                    </select>
                    <select
                        className="contact-filter-select"
                        value={selectedPropertyId}
                        onChange={(e) => setSelectedPropertyId(e.target.value)}
                        title="Filter by property"
                    >
                        <option value="">All properties</option>
                        {propertyOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.name}</option>
                        ))}
                    </select>
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
