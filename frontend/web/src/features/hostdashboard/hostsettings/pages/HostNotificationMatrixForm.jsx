import React, { useState } from "react";
import PropTypes from "prop-types";
import { HOST_NOTIFICATION_CATEGORIES } from "../../../../components/settings/hostNotificationMatrixConfig";
import "../styles/hostNotificationMatrix.css";

const displayValue = (value) => value || "—";

const HostNotificationMatrixForm = ({
    labels,
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
    const [activeCategory, setActiveCategory] = useState(HOST_NOTIFICATION_CATEGORIES[0].key);
    const category = HOST_NOTIFICATION_CATEGORIES.find((item) => item.key === activeCategory) || HOST_NOTIFICATION_CATEGORIES[0];
    const disabled = isLoading || isSaving || Boolean(loadError);

    return (
        <section className="personal-data-section host-notification-matrix">
            <h2 className="personal-data-section-title">{labels.title}</h2>
            <p className="host-notification-matrix-description">{labels.description}</p>

            <div className="host-notification-tabs" role="tablist" aria-label={labels.title}>
                {HOST_NOTIFICATION_CATEGORIES.map((item) => (
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeCategory === item.key}
                        className={activeCategory === item.key ? "host-notification-tab is-active" : "host-notification-tab"}
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
                                <th scope="col">{labels.columns.event}</th>
                                <th scope="col">{labels.columns.notification}</th>
                                <th scope="col">{labels.columns.channel}</th>
                                <th scope="col">{labels.columns.action}</th>
                                <th scope="col">{labels.columns.priority}</th>
                                <th scope="col">{labels.columns.recipients}</th>
                                <th scope="col">{labels.columns.enabled}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {category.events.map((event) => (
                                <tr key={event.key}>
                                    <td className="host-notification-event">{event.event}</td>
                                    <td>{displayValue(event.notification)}</td>
                                    <td>{displayValue(event.channel)}</td>
                                    <td>{displayValue(event.action)}</td>
                                    <td>{displayValue(event.priority)}</td>
                                    <td>{displayValue(event.recipients)}</td>
                                    <td>
                                        <label className="host-notification-checkbox-label">
                                            <input
                                                type="checkbox"
                                                aria-label={`${event.event} notifications`}
                                                checked={Boolean(preferences[event.key])}
                                                disabled={disabled}
                                                onChange={(change) => updatePreference(event.key, change.target.checked)}
                                            />
                                            <span>{preferences[event.key] ? labels.enabled : labels.disabled}</span>
                                        </label>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="personal-data-card-footer host-notification-matrix-footer">
                    <div className="host-notification-feedback" aria-live="polite">
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
        loading: PropTypes.string.isRequired,
        retry: PropTypes.string.isRequired,
        saved: PropTypes.string.isRequired,
        saving: PropTypes.string.isRequired,
        save: PropTypes.string.isRequired,
        enabled: PropTypes.string.isRequired,
        disabled: PropTypes.string.isRequired,
        tabs: PropTypes.object.isRequired,
        columns: PropTypes.object.isRequired,
    }).isRequired,
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
