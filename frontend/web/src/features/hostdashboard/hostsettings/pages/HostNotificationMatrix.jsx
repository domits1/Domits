import React, { useEffect, useMemo, useState } from "react";
import { Auth } from "aws-amplify";
import { useContext } from "react";
import { LanguageContext } from "../../../../context/LanguageContext";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
    cloneDefaultHostNotificationPreferences,
    HOST_NOTIFICATION_SECTIONS,
} from "../hostNotificationCatalog";
import {
    fetchHostNotificationPreferences,
    saveHostNotificationPreferences,
} from "../../../../components/settings/api/communicationPreferences";
import "../styles/hostNotificationMatrix.scss";

const BASE_PATH = "/hostdashboard/settings/communication-preferences";

const copyByLanguage = {
    en: {
        title: "Notification settings",
        subtitle: "Choose which updates you want to receive in your Host Dashboard.",
        tabs: {
            bookings: "Bookings",
            propertyManager: "Property Manager",
            staff: "Staff & Tasks",
            propertyOwner: "Property Owner",
            finance: "Finance",
            distribution: "Distribution",
            engineering: "Engineering",
            compliance: "Compliance",
        },
        notification: "Notification",
        channel: "Channel",
        action: "Action",
        priority: "Priority",
        enabled: "Receive",
        save: "Save changes",
        saving: "Saving...",
        saved: "Notification preferences saved.",
        loadError: "We could not load your notification preferences. Please try again.",
        saveError: "We could not save your notification preferences. Your changes are still here.",
        loading: "Loading notification preferences...",
        noEvents: "There are no notification options in this section.",
        accessDenied: "This section is only available to Admin and Engineer accounts.",
        note: "These settings save your notification choices. Delivery channels are shown as defined in the notification matrix.",
        recipientNote: "Intended recipients",
    },
    nl: {
        title: "Notificatie-instellingen",
        subtitle: "Kies welke updates je wilt ontvangen in je Host Dashboard.",
        tabs: {
            bookings: "Boekingen",
            propertyManager: "Property Manager",
            staff: "Medewerkers & taken",
            propertyOwner: "Property Owner",
            finance: "Financiën",
            distribution: "Distributie",
            engineering: "Engineering",
            compliance: "Compliance",
        },
        notification: "Notificatie",
        channel: "Kanaal",
        action: "Actie",
        priority: "Prioriteit",
        enabled: "Ontvangen",
        save: "Wijzigingen opslaan",
        saving: "Opslaan...",
        saved: "Notificatievoorkeuren opgeslagen.",
        loadError: "Notificatievoorkeuren laden is niet gelukt. Probeer het opnieuw.",
        saveError: "Notificatievoorkeuren opslaan is niet gelukt. Je wijzigingen zijn bewaard.",
        loading: "Notificatievoorkeuren laden...",
        noEvents: "Er zijn geen notificatieopties in dit onderdeel.",
        accessDenied: "Dit onderdeel is alleen beschikbaar voor Admin- en Engineer-accounts.",
        note: "Deze instellingen bewaren je notificatiekeuzes. De kanalen worden getoond zoals ze in de notificatiematrix staan.",
        recipientNote: "Bestemde ontvangers",
    },
    de: {
        title: "Benachrichtigungseinstellungen",
        subtitle: "Wähle aus, welche Updates du im Host-Dashboard erhalten möchtest.",
        tabs: {
            bookings: "Buchungen",
            propertyManager: "Property Manager",
            staff: "Mitarbeiter & Aufgaben",
            propertyOwner: "Property Owner",
            finance: "Finanzen",
            distribution: "Vertrieb",
            engineering: "Engineering",
            compliance: "Compliance",
        },
        notification: "Benachrichtigung",
        channel: "Kanal",
        action: "Aktion",
        priority: "Priorität",
        enabled: "Erhalten",
        save: "Änderungen speichern",
        saving: "Speichern...",
        saved: "Benachrichtigungseinstellungen gespeichert.",
        loadError: "Benachrichtigungseinstellungen konnten nicht geladen werden. Bitte erneut versuchen.",
        saveError: "Benachrichtigungseinstellungen konnten nicht gespeichert werden. Deine Änderungen sind noch vorhanden.",
        loading: "Benachrichtigungseinstellungen werden geladen...",
        noEvents: "In diesem Bereich gibt es keine Benachrichtigungsoptionen.",
        accessDenied: "Dieser Bereich ist nur für Admin- und Engineer-Konten verfügbar.",
        note: "Diese Einstellungen speichern deine Benachrichtigungswahl. Die Kanäle entsprechen der Benachrichtigungsmatrix.",
        recipientNote: "Vorgesehene Empfänger",
    },
    es: {
        title: "Configuración de notificaciones",
        subtitle: "Elige qué actualizaciones quieres recibir en tu panel de anfitrión.",
        tabs: {
            bookings: "Reservas",
            propertyManager: "Property Manager",
            staff: "Personal y tareas",
            propertyOwner: "Propietario",
            finance: "Finanzas",
            distribution: "Distribución",
            engineering: "Ingeniería",
            compliance: "Cumplimiento",
        },
        notification: "Notificación",
        channel: "Canal",
        action: "Acción",
        priority: "Prioridad",
        enabled: "Recibir",
        save: "Guardar cambios",
        saving: "Guardando...",
        saved: "Preferencias de notificación guardadas.",
        loadError: "No se pudieron cargar tus preferencias de notificación. Inténtalo de nuevo.",
        saveError: "No se pudieron guardar tus preferencias. Tus cambios siguen aquí.",
        loading: "Cargando preferencias de notificación...",
        noEvents: "No hay opciones de notificación en esta sección.",
        accessDenied: "Esta sección solo está disponible para cuentas de Admin e Engineer.",
        note: "Estos ajustes guardan tus preferencias. Los canales se muestran según la matriz de notificaciones.",
        recipientNote: "Destinatarios previstos",
    },
};

const normalizePreferences = (value) => {
    const defaults = cloneDefaultHostNotificationPreferences();
    if (!value || typeof value !== "object" || Array.isArray(value)) return defaults;

    return Object.fromEntries(
        Object.entries(defaults).map(([sectionKey, sectionDefaults]) => [
            sectionKey,
            Object.fromEntries(
                Object.entries(sectionDefaults).map(([eventKey, defaultValue]) => [
                    eventKey,
                    typeof value[sectionKey]?.[eventKey] === "boolean"
                        ? value[sectionKey][eventKey]
                        : defaultValue,
                ])
            ),
        ])
    );
};

const hasEngineeringAccess = async () => {
    try {
        const user = await Auth.currentAuthenticatedUser();
        const groups = [
            user?.attributes?.["custom:group"],
            user?.attributes?.["custom:role"],
            user?.signInUserSession?.idToken?.payload?.["cognito:groups"],
            user?.signInUserSession?.accessToken?.payload?.["cognito:groups"],
        ].flatMap((value) => Array.isArray(value) ? value : value ? [value] : [])
            .map((value) => String(value).trim().toLowerCase());
        return groups.includes("admin") || groups.includes("engineer");
    } catch {
        return false;
    }
};

const HostNotificationMatrix = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { language: selectedLanguage } = useContext(LanguageContext);
    const [preferences, setPreferences] = useState(cloneDefaultHostNotificationPreferences);
    const [savedPreferences, setSavedPreferences] = useState(cloneDefaultHostNotificationPreferences);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [error, setError] = useState("");
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [canAccessEngineering, setCanAccessEngineering] = useState(false);
    const [engineeringAccessChecked, setEngineeringAccessChecked] = useState(false);

    const normalizedLanguage = String(selectedLanguage || "en").slice(0, 2).toLowerCase();
    const language = copyByLanguage[normalizedLanguage] ? normalizedLanguage : "en";
    const t = copyByLanguage[language];

    const activePath = location.pathname.startsWith(BASE_PATH)
        ? location.pathname.slice(BASE_PATH.length).replace(/^\/+|\/+$/g, "")
        : "";
    const activeSection = HOST_NOTIFICATION_SECTIONS.find((section) => section.path === activePath)
        || HOST_NOTIFICATION_SECTIONS.find((section) => section.key === "propertyManager");
    const isEngineeringRoute = activeSection.key === "engineering";

    useEffect(() => {
        let isMounted = true;
        hasEngineeringAccess().then((allowed) => {
            if (isMounted) {
                setCanAccessEngineering(allowed);
                setEngineeringAccessChecked(true);
            }
        });
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadPreferences = async () => {
            setIsLoading(true);
            setError("");
            try {
                const loaded = normalizePreferences(await fetchHostNotificationPreferences());
                if (!isMounted) return;
                setPreferences(loaded);
                setSavedPreferences(loaded);
                setHasLoaded(true);
            } catch {
                if (!isMounted) return;
                setError(t.loadError);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadPreferences();
        return () => {
            isMounted = false;
        };
    }, [t.loadError]);

    useEffect(() => {
        if (engineeringAccessChecked && isEngineeringRoute && !canAccessEngineering) {
            navigate(BASE_PATH, { replace: true });
        }
    }, [canAccessEngineering, engineeringAccessChecked, isEngineeringRoute, navigate]);

    const isDirty = useMemo(
        () => JSON.stringify(preferences) !== JSON.stringify(savedPreferences),
        [preferences, savedPreferences]
    );

    const toggleEvent = (sectionKey, eventKey, enabled) => {
        setPreferences((current) => ({
            ...current,
            [sectionKey]: {
                ...current[sectionKey],
                [eventKey]: enabled,
            },
        }));
        setError("");
        setSaveSuccess(false);
    };

    const save = async () => {
        if (!hasLoaded || isLoading || isSaving || !isDirty) return;
        setIsSaving(true);
        setError("");
        setSaveSuccess(false);
        try {
            const payload = { ...preferences };
            if (!canAccessEngineering) delete payload.engineering;
            const saved = normalizePreferences(await saveHostNotificationPreferences(payload));
            setPreferences(saved);
            setSavedPreferences(saved);
            setSaveSuccess(true);
        } catch {
            setError(t.saveError);
        } finally {
            setIsSaving(false);
        }
    };

    if (isEngineeringRoute && engineeringAccessChecked && !canAccessEngineering) {
        return null;
    }

    if (isEngineeringRoute && !engineeringAccessChecked) {
        return <div className="host-notification-matrix-status" role="status">{t.loading}</div>;
    }

    return (
        <section className="host-notification-matrix" aria-label={t.title}>
            <div className="host-notification-matrix-heading">
                <div>
                    <h2>{t.title}</h2>
                    <p>{t.subtitle}</p>
                </div>
            </div>

            <nav className="host-notification-tabs" aria-label="Notification categories">
                {HOST_NOTIFICATION_SECTIONS
                    .filter((section) => !section.adminOnly || canAccessEngineering)
                    .map((section) => (
                        <NavLink
                            key={section.key}
                            end={!section.path}
                            to={section.path ? `${BASE_PATH}/${section.path}` : BASE_PATH}
                            className={({ isActive }) =>
                                `host-notification-tab ${(isActive && section.path) || (!activePath && !section.path) ? "active" : ""}`
                            }
                        >
                            {t.tabs[section.key]}
                        </NavLink>
                    ))}
            </nav>

            <div className="host-notification-section-heading">
                <h3>{t.tabs[activeSection.key]}</h3>
                <span>{activeSection.events.length} options</span>
            </div>

            <div className="host-notification-table-wrap">
                <table className="host-notification-table">
                    <thead>
                        <tr>
                            <th scope="col">{t.notification}</th>
                            <th scope="col">{t.channel}</th>
                            <th scope="col">{t.action}</th>
                            <th scope="col">{t.priority}</th>
                            <th scope="col">{t.enabled}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeSection.events.map((event) => (
                            <tr key={event.key}>
                                <td data-label={t.notification}>
                                    <span className="host-notification-event-name">{event.name}</span>
                                    <span className="host-notification-recipients">
                                        {t.recipientNote}: {event.recipients.join(", ")}
                                    </span>
                                </td>
                                <td data-label={t.channel}>{event.channels}</td>
                                <td data-label={t.action}>{event.action}</td>
                                <td data-label={t.priority}>
                                    <span className={`host-notification-priority host-notification-priority--${event.priority.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                                        {event.priority}
                                    </span>
                                </td>
                                <td data-label={t.enabled}>
                                    <input
                                        type="checkbox"
                                        className="host-notification-checkbox"
                                        aria-label={`${event.name} notifications`}
                                        checked={Boolean(preferences[activeSection.key]?.[event.key])}
                                        disabled={!hasLoaded || isLoading || isSaving}
                                        onChange={(change) => toggleEvent(activeSection.key, event.key, change.target.checked)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {activeSection.key === "bookings" && (
                    <p className="host-notification-footnote">* Staff notifications are sent only where operational action is required.</p>
                )}
            </div>

            <div className="host-notification-matrix-footer">
                <p className="host-notification-matrix-note">{t.note}</p>
                <div className="host-notification-matrix-feedback" aria-live="polite">
                    {isLoading && <span role="status">{t.loading}</span>}
                    {error && <span className="host-notification-error">{error}</span>}
                    {saveSuccess && !error && <span className="host-notification-success">{t.saved}</span>}
                </div>
                <button
                    type="button"
                    className="host-notification-save"
                    disabled={!hasLoaded || isLoading || isSaving || !isDirty}
                    onClick={save}
                >
                    {isSaving ? t.saving : t.save}
                </button>
            </div>
        </section>
    );
};

export default HostNotificationMatrix;
