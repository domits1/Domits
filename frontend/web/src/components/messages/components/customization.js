const Customization = ({ events = {}, onTemplateChange, selectedEventId, onSelectEvent }) => {
    const eventEntries = Object.values(events);
    if (!eventEntries.length) {
        return <p className="empty-state">No templates available.</p>;
    }

    const handleChange = (eventId, value) => {
        onTemplateChange?.(eventId, value);
        onSelectEvent?.(eventId);
    };

    return (
        <div className="customization">
            {eventEntries.map((event) => (
                <div key={event.id} className={`custom-msg ${selectedEventId === event.id ? 'selected' : ''}`}>
                    <div className="custom-msg-heading">
                        <h3>{event.label}</h3>
                        <button type="button" onClick={() => onSelectEvent?.(event.id)}>
                            Preview
                        </button>
                    </div>
                    <textarea
                        value={event.template || ''}
                        onChange={(e) => handleChange(event.id, e.target.value)}
                        placeholder="Write the message Domits should send for you"
                    />
                </div>
            ))}
        </div>
    );
};

export default Customization;
