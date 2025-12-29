const Scheduling = ({ events = {}, onDelayChange }) => {
    const eventEntries = Object.values(events);
    if (!eventEntries.length) {
        return <p className="empty-state">No events to schedule.</p>;
    }

    return (
        <div className="scheduling">
            {eventEntries.map((event) => (
                <div key={event.id} className="schedule-row">
                    <div className="schedule-row-heading">
                        <label>{event.label}</label>
                        <span>{event.sendDelayMinutes ? `${event.sendDelayMinutes} min` : 'Immediately'}</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="240"
                        step="5"
                        value={event.sendDelayMinutes || 0}
                        onChange={(e) => onDelayChange?.(event.id, Number(e.target.value))}
                    />
                    <p>Send {event.sendDelayMinutes ? `${event.sendDelayMinutes} minutes` : 'right away'} after the trigger.</p>
                </div>
            ))}
        </div>
    );
};

export default Scheduling;