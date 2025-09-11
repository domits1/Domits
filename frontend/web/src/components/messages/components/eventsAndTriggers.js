import React, { useState } from 'react';

const placeholderOptions = [
    { label: 'Booking Confirmation', enabled: true, description: 'Send confirmation when booking is made' },
    { label: 'Check-in Instructions', enabled: true, description: 'Send check-in details 24 hours before arrival' },
    { label: 'Check-out Instructions', enabled: true, description: 'Send check-out reminders 2 hours before departure' },
    { label: 'Reminders', enabled: true, description: 'Send booking reminders and updates' },
    { label: 'Feedback/Review request', enabled: true, description: 'Request feedback after stay completion' },
    { label: 'Wi-Fi Info', enabled: true, description: 'Send Wi-Fi credentials upon check-in' },
];

const EventsAndTriggers = () => {
    const [settings, setSettings] = React.useState(() => {
        const saved = localStorage.getItem('automatedSettings');
        return saved ? JSON.parse(saved) : placeholderOptions;
    });

    const handleToggle = (index) => {
        const updatedSettings = [...settings];
        updatedSettings[index].enabled = !updatedSettings[index].enabled;
        setSettings(updatedSettings);
        localStorage.setItem('automatedSettings', JSON.stringify(updatedSettings));
    };

    const handleCustomMessage = (index) => {
        const customMessage = prompt(`Enter custom message for ${settings[index].label}:`, settings[index].customMessage || '');
        if (customMessage !== null) {
            const updatedSettings = [...settings];
            updatedSettings[index].customMessage = customMessage;
            setSettings(updatedSettings);
            localStorage.setItem('automatedSettings', JSON.stringify(updatedSettings));
        }
    };

    return (
        <div className="optionItems">
            <div className="settings-header">
                <h3>Automated Message Settings</h3>
                <p>Configure when to send automated messages to your guests</p>
            </div>
            {settings.map((item, index) => (
                <div key={index} className="option-row">
                    <div className="placeholder-left">
                        <span className="placeholder-text">{item.label}</span>
                        <span className="placeholder-description">{item.description}</span>
                    </div>
                    <div className="option-controls">
                        <span
                            className="placeholder-icon"
                            onClick={() => handleCustomMessage(index)}
                            title="Customize message"
                        >
                            ✎
                        </span>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={item.enabled}
                                onChange={() => handleToggle(index)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
            ))}
            <button className="add-more-placeholder">+ Add more</button>
        </div>
    );
};

export default EventsAndTriggers;
