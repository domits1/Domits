
import React, { useEffect } from 'react';
import useFetchContacts from '../../features/hostdashboard/hostmessages/hooks/useFetchContacts';

const SimpleContactList = ({ userId, role = 'host', onSelect }) => {
    const { contacts, pendingContacts, loading, error } = useFetchContacts(userId, role);

    useEffect(() => {
        if (!loading && contacts.length > 0 && onSelect) {
            // Auto-select the first contact for quick demo
            onSelect({ id: contacts[0].recipientId, name: contacts[0].givenName });
        }
    }, [loading]);

    const list = contacts;

    return (
        <div style={{ padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>Contacts</h3>
            {loading && <div>Loading...</div>}
            {error && <div style={{ color: 'red' }}>{String(error)}</div>}
            {!loading && list.length === 0 && <div>No contacts yet</div>}
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {list.map((c) => (
                    <li key={c.recipientId}>
                        <button
                            onClick={() => onSelect?.({ id: c.recipientId, name: c.givenName })}
                            style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 10px',
                                border: '1px solid #e5e5e5',
                                borderRadius: 6,
                                marginBottom: 8,
                                background: '#fff',
                                cursor: 'pointer'
                            }}
                        >
                            <div style={{ fontWeight: 600 }}>{c.givenName || 'Unknown'}</div>
                            <div style={{ fontSize: 12, color: '#777' }}>
                                {c.latestMessage?.text || 'No messages yet'}
                            </div>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default SimpleContactList;


