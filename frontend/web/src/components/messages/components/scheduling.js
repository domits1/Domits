const Scheduling = ({ events = {}, onDelayChange }) => {
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> ee150f37e (comments from pr)
  const eventEntries = Object.values(events);
  if (!eventEntries.length) {
    return <p className="empty-state">No events to schedule.</p>;
  }
<<<<<<< HEAD

<<<<<<< HEAD
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
=======
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
            className="schedule-select">
            <option value={0}>Immediately</option>
            <option value={1}>1 minute</option>
            <option value={2}>2 minutes</option>
            <option value={3}>3 minutes</option>
            <option value={4}>4 minutes</option>
            <option value={5}>5 minutes</option>
          </select>
>>>>>>> ee150f37e (comments from pr)
        </div>
      ))}
    </div>
  );
};
=======
    const eventEntries = Object.values(events);
    if (!eventEntries.length) {
        return <p className="empty-state">No events to schedule.</p>;
    }
>>>>>>> 387939875 (feat: Add automated messages system with templates and customization)
=======
>>>>>>> ee150f37e (comments from pr)

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
            className="schedule-select">
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
