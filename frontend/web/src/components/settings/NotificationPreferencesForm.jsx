import React, { useState } from "react";
import PropTypes from "prop-types";
import {
    DEFAULT_NOTIFICATION_PREFERENCES,
    REQUIRED_COMMUNICATION_PREFERENCES,
    enforceRequiredCommunicationPreferences,
} from "./communicationPreferencesConfig";

const EVENT_KEYS = ["reservation", "cancellation", "messages"];
const CHANNEL_KEYS = ["email", "sms", "push"];
const isRequiredPreference = (eventKey, channelKey) => Boolean(REQUIRED_COMMUNICATION_PREFERENCES[eventKey]?.[channelKey]);

const NotificationPreferencesForm = ({
    labels,
    preferences: controlledPreferences,
    onPreferencesChange,
    onSave,
    isLoading = false,
    isSaving = false,
    isDirty = false,
    saveSuccess = false,
    error = "",
}) => {
    const [localPreferences, setLocalPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
    const isControlled = controlledPreferences && onPreferencesChange;
    const preferences = enforceRequiredCommunicationPreferences(isControlled ? controlledPreferences : localPreferences);
    const saveDisabled = isLoading || isSaving || !isDirty;

    const updatePreferences = (nextPreferences) => {
        const normalized = enforceRequiredCommunicationPreferences(nextPreferences);
        if (isControlled) {
            onPreferencesChange(normalized);
            return;
        }
        setLocalPreferences(normalized);
    };

    const togglePreference = (eventKey, channelKey) => {
        if (isLoading || isSaving || isRequiredPreference(eventKey, channelKey)) {
            return;
        }

        updatePreferences({
            ...preferences,
            [eventKey]: {
                ...preferences[eventKey],
                [channelKey]: !preferences[eventKey][channelKey],
            },
        });
    };

    return (
        <div className="personal-data-section">
            <h2 className="personal-data-section-title">{labels.sectionTitle}</h2>
            <div className="personal-data-card notification-preferences-card" aria-busy={isLoading || isSaving}>
                {isLoading && (
                    <div className="notification-preferences-status" role="status">
                        Loading communication preferences...
                    </div>
                )}

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
                                            disabled={required || isLoading || isSaving}
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

                <div className="personal-data-card-footer notification-preferences-footer">
                    <div className="notification-preferences-feedback" aria-live="polite">
                        {error && <span className="notification-preferences-error">{error}</span>}
                        {saveSuccess && !error && <span className="notification-preferences-success">Communication preferences saved.</span>}
                    </div>
                    <button type="button" className="pd-save-btn" disabled={saveDisabled} onClick={onSave}>
                        {isSaving ? "Saving..." : labels.actions.saveChanges}
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
    preferences: PropTypes.shape({
        reservation: PropTypes.shape({
            email: PropTypes.bool.isRequired,
            sms: PropTypes.bool.isRequired,
            push: PropTypes.bool.isRequired,
        }),
        cancellation: PropTypes.shape({
            email: PropTypes.bool.isRequired,
            sms: PropTypes.bool.isRequired,
            push: PropTypes.bool.isRequired,
        }),
        messages: PropTypes.shape({
            email: PropTypes.bool.isRequired,
            sms: PropTypes.bool.isRequired,
            push: PropTypes.bool.isRequired,
        }),
    }),
    onPreferencesChange: PropTypes.func,
    onSave: PropTypes.func,
    isLoading: PropTypes.bool,
    isSaving: PropTypes.bool,
    isDirty: PropTypes.bool,
    saveSuccess: PropTypes.bool,
    error: PropTypes.string,
};

export default NotificationPreferencesForm;
