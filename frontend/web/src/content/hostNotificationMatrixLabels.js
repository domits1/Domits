const LANGUAGES = ["en", "nl", "de", "es"];

const LABELS = {
    title: ["Notifications", "Meldingen", "Benachrichtigungen", "Notificaciones"],
    description: [
        "Choose how you want to receive each notification.",
        "Kies hoe je elke melding wilt ontvangen.",
        "Wähle aus, wie du die einzelnen Benachrichtigungen erhalten möchtest.",
        "Elige cómo quieres recibir cada notificación.",
    ],
    event: ["Notification", "Melding", "Benachrichtigung", "Notificación"],
    disableAllEmail: [
        "Turn off all email notifications",
        "Alle e-mailmeldingen uitzetten",
        "Alle E-Mail-Benachrichtigungen ausschalten",
        "Desactivar todos los correos",
    ],
    enableAllEmail: [
        "Turn on all email notifications",
        "Alle e-mailmeldingen aanzetten",
        "Alle E-Mail-Benachrichtigungen einschalten",
        "Activar todos los correos",
    ],
    loading: [
        "Loading notification preferences...",
        "Meldingvoorkeuren laden...",
        "Benachrichtigungseinstellungen werden geladen...",
        "Cargando preferencias de notificación...",
    ],
    retry: ["Retry", "Opnieuw proberen", "Erneut versuchen", "Reintentar"],
    saved: [
        "Notification preferences saved.",
        "Meldingvoorkeuren opgeslagen.",
        "Benachrichtigungseinstellungen gespeichert.",
        "Preferencias de notificación guardadas.",
    ],
    saving: ["Saving...", "Opslaan...", "Speichern...", "Guardando..."],
    save: ["Save preferences", "Voorkeuren opslaan", "Einstellungen speichern", "Guardar preferencias"],
    channels: {
        inApp: ["In-app", "In-app", "In-App", "En la app"],
        email: ["Email", "E-mail", "E-Mail", "Correo"],
        sms: ["SMS", "Sms", "SMS", "SMS"],
    },
    tabs: {
        propertyManager: ["Property Manager", "Property Manager", "Property Manager", "Property Manager"],
        bookings: ["Bookings & Reservations", "Boekingen & reserveringen", "Buchungen & Reservierungen", "Reservas"],
        propertyOwner: ["Property Owner", "Woning eigenaar", "Immobilieneigentümer", "Propietario"],
        finance: ["Finance", "Financiën", "Finanzen", "Finanzas"],
        distribution: ["Distribution", "Distributie", "Vertrieb", "Distribución"],
        compliance: ["Compliance", "Compliance", "Compliance", "Cumplimiento"],
        tasks: ["Tasks", "Taken", "Aufgaben", "Tareas"],
    },
};

const localize = (values, languageIndex) => Object.fromEntries(
    Object.entries(values).map(([key, translations]) => [key, translations[languageIndex]])
);

export const getHostNotificationMatrixLabels = (language) => {
    const selectedIndex = LANGUAGES.indexOf(language);
    const languageIndex = selectedIndex < 0 ? 0 : selectedIndex;

    return {
        title: LABELS.title[languageIndex],
        description: LABELS.description[languageIndex],
        event: LABELS.event[languageIndex],
        disableAllEmail: LABELS.disableAllEmail[languageIndex],
        enableAllEmail: LABELS.enableAllEmail[languageIndex],
        loading: LABELS.loading[languageIndex],
        retry: LABELS.retry[languageIndex],
        saved: LABELS.saved[languageIndex],
        saving: LABELS.saving[languageIndex],
        save: LABELS.save[languageIndex],
        channels: localize(LABELS.channels, languageIndex),
        tabs: localize(LABELS.tabs, languageIndex),
    };
};
