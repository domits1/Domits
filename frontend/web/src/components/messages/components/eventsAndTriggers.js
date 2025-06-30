const placeholderOptions = [
    { label: 'Booking Confirmation', enabled: true },
    { label: 'Check-in Instructions', enabled: false },
    { label: 'Check-out Instructions', enabled: false },
    { label: 'Reminders', enabled: false },
    { label: 'Feedback/Review request', enabled: false },
    { label: 'Wi-Fi Info', enabled: true },
];

const EventsAndTriggers = () => {
    return (
        <div className="optionItems">
            {placeholderOptions.map((item, index) => (
                <div key={index} className="option-row">
                    <div className="placeholder-left">
                        <span className="placeholder-text">{item.label}</span>
                    </div>
                    <span className="placeholder-icon">✎</span>
                    <input type="checkbox" checked={item.enabled} readOnly />
                </div>
            ))}
            <button className="add-more-placeholder">+ Add more</button>
        </div>
    );
};

export default EventsAndTriggers;
