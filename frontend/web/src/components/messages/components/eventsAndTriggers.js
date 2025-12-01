const EventsAndTriggers = ({ events = {}, onToggle }) => {
    const eventEntries = Object.values(events);
    if (!eventEntries.length) {
        return <p className="empty-state">No automation events available.</p>;
    }

    return (
        <div className="events-triggers">
            {eventEntries.map((event) => (
                <div key={event.id} className="event-row">
                    <div className="event-row-heading">
                        <label>
                            <input
                                type="checkbox"
                                checked={!!event.enabled}
                                onChange={() => onToggle?.(event.id)}
                            />
                            {event.label}
                        </label>
                        <span className={`badge ${event.enabled ? 'enabled' : 'disabled'}`}>
                            {event.enabled ? 'Active' : 'Paused'}
                        </span>
                    </div>
                    <p className="event-description">{event.description}</p>
                </div>
            ))}
        </div>
    );
};

export default EventsAndTriggers;
