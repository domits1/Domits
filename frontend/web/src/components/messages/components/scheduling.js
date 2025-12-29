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
                    </div>
                    <select
                        value={event.sendDelayMinutes || 0}
                        onChange={(e) => onDelayChange?.(event.id, Number(e.target.value))}
                        style={{
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                            width: '100%',
                            marginTop: '8px',
                            marginBottom: '8px'
                        }}
                    >
                        <option value={0}>Immediately</option>
                        <option value={1}>1 minute</option>
                        <option value={2}>2 minutes</option>
                        <option value={3}>3 minutes</option>
                        <option value={4}>4 minutes</option>
                        <option value={5}>5 minutes</option>
                    </select>
                </div>
            ))}
        </div>
    );
};

export default Scheduling;