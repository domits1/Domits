import React, { useState } from "react";
import PropTypes from "prop-types";
import "../styles/hostNotificationMatrix.css";

const CHANNELS = ["inApp", "email", "sms"];

const HostNotificationMatrixForm = ({
    labels,
    categories,
    preferences,
    updatePreference,
    isLoading,
    isSaving,
    loadError,
    error,
    saveSuccess,
    isDirty,
    onSave,
    onRetry,
}) => {
    const [activeCategory, setActiveCategory] = useState("");
    const category = categories.find((item) => item.key === activeCategory) || categories[0];
    const optionalEmailEventKeys = categories
        .flatMap((item) => item.events)
        .filter((event) => !event.requiredChannels?.includes("email"))
        .map((event) => event.key);
    const disabled = isLoading || isSaving || Boolean(loadError);
    const allEmailDisabled = optionalEmailEventKeys.length > 0 &&
        optionalEmailEventKeys.every((eventKey) => !preferences[eventKey]?.email);

    const toggleAllEmail = () => {
        optionalEmailEventKeys.forEach((eventKey) => updatePreference(eventKey, "email", allEmailDisabled));
    };

    return (
        <section className="personal-data-section host-notification-matrix">
            <h2 className="personal-data-section-title">{labels.title}</h2>
            <p className="host-notification-matrix-description">{labels.description}</p>
            <p className="host-notification-event-names-note">{labels.eventNamesNote}</p>

            <button
                type="button"
                className="host-notification-bulk-action"
                onClick={toggleAllEmail}
                disabled={disabled || optionalEmailEventKeys.length === 0}
            >
                {allEmailDisabled ? labels.enableAllEmail : labels.disableAllEmail}
            </button>

            <div className="host-notification-tabs" role="tablist" aria-label={labels.title}>
                {categories.map((item) => (
                    <button
                        type="button"
                        role="tab"
                        aria-selected={category?.key === item.key}
                        className={category?.key === item.key ? "host-notification-tab is-active" : "host-notification-tab"}
                        key={item.key}
                        onClick={() => setActiveCategory(item.key)}
                    >
                        {labels.tabs[item.labelKey]}
                        <span className="host-notification-tab-count">{item.events.length}</span>
                    </button>
                ))}
            </div>

            <div className="personal-data-card host-notification-matrix-card" aria-busy={isLoading || isSaving}>
                {isLoading && <div className="host-notification-status" role="status">{labels.loading}</div>}
                {loadError && (
                    <div className="host-notification-error" role="alert">
                        <span>{loadError}</span>
                        <button type="button" onClick={onRetry}>{labels.retry}</button>
                    </div>
                )}

                <div className="host-notification-table-wrap">
                    <table className="host-notification-table">
                        <thead>
                            <tr>
                                <th scope="col">{labels.event}</th>
                                {CHANNELS.map((channel) => (
                                    <th scope="col" key={channel}>{labels.channels[channel]}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {category?.events.map((event) => (
                                <tr key={event.key}>
                                    <td className="host-notification-event">{labels.eventNames?.[event.key] || event.event}</td>
                                    {CHANNELS.map((channel) => {
                                        const isRequiredEmail = channel === "email" && event.requiredChannels?.includes("email");
                                        return (
                                            <td key={channel}>
                                                <label className="host-notification-checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        aria-label={(labels.eventNames?.[event.key] || event.event) + " - " + labels.channels[channel]}
                                                        checked={Boolean(preferences[event.key]?.[channel])}
                                                        disabled={disabled || Boolean(isRequiredEmail)}
                                                        onChange={(change) => updatePreference(event.key, channel, change.target.checked)}
                                                    />
                                                    {isRequiredEmail && (
                                                        <span className="host-notification-required-label">{labels.required}</span>
                                                    )}
                                                </label>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="personal-data-card-footer host-notification-matrix-footer">
                    <div className="host-notification-feedback" role="status" aria-live="polite">
                        {error && <span className="notification-preferences-error">{error}</span>}
                        {saveSuccess && !error && <span className="notification-preferences-success">{labels.saved}</span>}
                    </div>
                    <button type="button" className="pd-save-btn" disabled={disabled || !isDirty} onClick={onSave}>
                        {isSaving ? labels.saving : labels.save}
                    </button>
                </div>
            </div>
        </section>
    );
};

HostNotificationMatrixForm.propTypes = {
    labels: PropTypes.shape({
        title: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
        event: PropTypes.string.isRequired,
        required: PropTypes.string.isRequired,
        loading: PropTypes.string.isRequired,
        retry: PropTypes.string.isRequired,
        saved: PropTypes.string.isRequired,
        saving: PropTypes.string.isRequired,
        save: PropTypes.string.isRequired,
        disableAllEmail: PropTypes.string.isRequired,
        enableAllEmail: PropTypes.string.isRequired,
        tabs: PropTypes.object.isRequired,
        channels: PropTypes.object.isRequired,
    }).isRequired,
    categories: PropTypes.array.isRequired,
    preferences: PropTypes.object.isRequired,
    updatePreference: PropTypes.func.isRequired,
    isLoading: PropTypes.bool.isRequired,
    isSaving: PropTypes.bool.isRequired,
    loadError: PropTypes.string.isRequired,
    error: PropTypes.string.isRequired,
    saveSuccess: PropTypes.bool.isRequired,
    isDirty: PropTypes.bool.isRequired,
    onSave: PropTypes.func.isRequired,
    onRetry: PropTypes.func.isRequired,
};

export default HostNotificationMatrixForm;
