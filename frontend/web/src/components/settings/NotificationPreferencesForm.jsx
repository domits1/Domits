import React, { useState } from "react";
import PropTypes from "prop-types";

export const DEFAULT_NOTIFICATION_PREFERENCES = {
    reservation: {
        email: true,
        sms: false,
        push: true,
    },
    cancellation: {
        email: true,
        sms: true,
        push: true,
    },
    messages: {
        email: true,
        sms: false,
        push: true,
    },
};

const EVENT_KEYS = ["reservation", "cancellation", "messages"];
const CHANNEL_KEYS = ["email", "sms", "push"];
const REQUIRED_PREFERENCES = {
    reservation: { email: true },
    cancellation: { email: true },
};

const isRequiredPreference = (eventKey, channelKey) => Boolean(REQUIRED_PREFERENCES[eventKey]?.[channelKey]);

const NotificationPreferencesForm = ({ labels }) => {
    const [preferences, setPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES);

    const togglePreference = (eventKey, channelKey) => {
        if (isRequiredPreference(eventKey, channelKey)) {
            return;
        }

        setPreferences((current) => ({
            ...current,
            [eventKey]: {
                ...current[eventKey],
                [channelKey]: !current[eventKey][channelKey],
            },
        }));
    };

    return (
        <div className="personal-data-section">
            <h2 className="personal-data-section-title">{labels.sectionTitle}</h2>
            <div className="personal-data-card notification-preferences-card">
                <div className="notification-preferences-grid" role="table" aria-label={labels.sectionTitle}>
                    <div className="notification-preferences-row notification-preferences-row--head" role="row">
                        <div className="notification-preferences-cell notification-preferences-cell--event" role="columnheader" />
                        {CHANNEL_KEYS.map((channelKey) => (
                            <div className="notification-preferences-cell notification-preferences-cell--channel" role="columnheader" key={channelKey}>
                                {labels.channels[channelKey]}
                            </div>
                        ))}
                    </div>

                    {EVENT_KEYS.map((eventKey) => (
                        <div className="notification-preferences-row" role="row" key={eventKey}>
                            <div className="notification-preferences-cell notification-preferences-cell--event" role="rowheader">
                                {labels.events[eventKey]}
                            </div>
                            {CHANNEL_KEYS.map((channelKey) => {
                                const required = isRequiredPreference(eventKey, channelKey);
                                const checked = required || preferences[eventKey][channelKey];
                                const requiredId = `notification-${eventKey}-${channelKey}-required`;
                                const ariaLabel = `${labels.events[eventKey]} ${labels.channels[channelKey]} ${labels.notificationsLabel}`;

                                return (
                                    <div className="notification-preferences-cell notification-preferences-cell--toggle" role="cell" key={channelKey}>
                                        <button
                                            type="button"
                                            className={`notification-toggle ${checked ? "notification-toggle--on" : "notification-toggle--off"}`}
                                            role="switch"
                                            aria-checked={checked}
                                            aria-label={ariaLabel}
                                            aria-describedby={required ? requiredId : undefined}
                                            disabled={required}
                                            onClick={() => togglePreference(eventKey, channelKey)}
                                        >
                                            <span className="notification-toggle-text">{checked ? labels.states.on : labels.states.off}</span>
                                            <span className="notification-toggle-thumb" aria-hidden="true" />
                                        </button>
                                        {required && (
                                            <span className="notification-required-label" id={requiredId}>
                                                {labels.required}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                <div className="personal-data-card-footer">
                    <button type="button" className="pd-save-btn" disabled>
                        {labels.actions.saveChanges}
                    </button>
                </div>
            </div>
        </div>
    );
};

NotificationPreferencesForm.propTypes = {
    labels: PropTypes.shape({
        sectionTitle: PropTypes.string.isRequired,
        notificationsLabel: PropTypes.string.isRequired,
        required: PropTypes.string.isRequired,
        channels: PropTypes.shape({
            email: PropTypes.string.isRequired,
            sms: PropTypes.string.isRequired,
            push: PropTypes.string.isRequired,
        }).isRequired,
        events: PropTypes.shape({
            reservation: PropTypes.string.isRequired,
            cancellation: PropTypes.string.isRequired,
            messages: PropTypes.string.isRequired,
        }).isRequired,
        states: PropTypes.shape({
            on: PropTypes.string.isRequired,
            off: PropTypes.string.isRequired,
        }).isRequired,
        actions: PropTypes.shape({
            saveChanges: PropTypes.string.isRequired,
        }).isRequired,
    }).isRequired,
};

export default NotificationPreferencesForm;