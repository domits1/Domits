import { FaPlus, FaTrash, FaPen } from 'react-icons/fa';

const EventsAndTriggers = ({ events = {}, onToggle, onAddCustomEvent, onDeleteEvent, onRenameEvent }) => {
    const eventEntries = Object.values(events);

    const handleRename = (eventId, currentLabel) => {
        const newLabel = window.prompt('Enter new name for this automation:', currentLabel);
        if (newLabel && newLabel.trim() !== '') {
            onRenameEvent?.(eventId, newLabel.trim());
        }
    };

    return (
        <div className="events-triggers">
            <div className="events-list">
                {eventEntries.length === 0 && (
                    <p className="empty-state">No automation events available.</p>
                )}
                {eventEntries.map((event) => (
                    <div key={event.id} className="event-row">
                        <div className="event-row-header">
                            <div className="event-main-toggle">
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={!!event.enabled}
                                        onChange={() => onToggle?.(event.id)}
                                    />
                                    <span className="slider round"></span>
                                </label>
                                <div className="event-info">
                                    <span className="event-label">{event.label}</span>
                                    <p className="event-description">{event.description}</p>
                                </div>
                            </div>
                            <div className="event-actions">
                                {event.isCustom && (
                                    <>
                                        <button 
                                            className="icon-btn edit-btn" 
                                            onClick={() => handleRename(event.id, event.label)}
                                            title="Rename"
                                        >
                                            <FaPen />
                                        </button>
                                        <button 
                                            className="icon-btn delete-btn" 
                                            onClick={() => onDeleteEvent?.(event.id)}
                                            title="Delete"
                                        >
                                            <FaTrash />
                                        </button>
                                    </>
                                )}
                                <span className={`status-badge ${event.enabled ? 'active' : 'paused'}`}>
                                    {event.enabled ? 'Active' : 'Paused'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <button className="add-custom-event-btn" onClick={onAddCustomEvent}>
                <FaPlus /> Add custom automated message
            </button>
        </div>
    );
};

export default EventsAndTriggers;
