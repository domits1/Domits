<<<<<<< HEAD
import { personalizeTemplate } from "../automationConfig";
import { sampleData } from "../utils/mockData";

const Preview = ({ events = {}, selectedEventId, onSelectEvent }) => {
  const eventEntries = Object.values(events);
  if (!eventEntries.length) {
    return <p className="empty-state">Select an event to preview the outgoing message.</p>;
  }

  const currentEvent = events[selectedEventId] || eventEntries[0];

  return (
    <div className="preview">
      <div className="preview-header">
        <label htmlFor="preview-event-select">Select event:</label>
        <select id="preview-event-select" value={currentEvent?.id} onChange={(e) => onSelectEvent?.(e.target.value)}>
          {eventEntries.map((event) => (
            <option key={event.id} value={event.id}>
              {event.label}
            </option>
          ))}
        </select>
      </div>
      <div className="preview-chat">
        <div className="bubble">
          <p>{personalizeTemplate(currentEvent?.template, sampleData)}</p>
        </div>
      </div>
    </div>
  );
=======
import { personalizeTemplate } from '../automationConfig';

const sampleData = {
    guestName: 'Taylor',
    propertyName: 'Canal Loft',
    checkInDate: '12 Mar',
    checkOutDate: '15 Mar',
    checkInTime: '15:00',
    checkOutTime: '11:00',
    wifiName: 'Domits-Guest',
    wifiPassword: 'Summer2024!',
    entryCode: '4820#',
};

const Preview = ({ events = {}, selectedEventId, onSelectEvent }) => {
    const eventEntries = Object.values(events);
    if (!eventEntries.length) {
        return <p className="empty-state">Select an event to preview the outgoing message.</p>;
    }

    const currentEvent = events[selectedEventId] || eventEntries[0];

    return (
        <div className="preview">
            <div className="preview-header">
                <label htmlFor="preview-event-select">Select event:</label>
                <select
                    id="preview-event-select"
                    value={currentEvent?.id}
                    onChange={(e) => onSelectEvent?.(e.target.value)}
                >
                    {eventEntries.map((event) => (
                        <option key={event.id} value={event.id}>
                            {event.label}
                        </option>
                    ))}
                </select>
            </div>
            <div className="preview-chat">
                <div className="bubble">
                    <p>{personalizeTemplate(currentEvent?.template, sampleData)}</p>
                </div>
            </div>
        </div>
    );
>>>>>>> 387939875 (feat: Add automated messages system with templates and customization)
};

export default Preview;