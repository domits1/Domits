const STORAGE_KEY_PREFIX = 'domits_automation_settings_';
const SENT_RECORDS_KEY = 'domits_automation_sent_records';

export const DEFAULT_AUTOMATION_EVENTS = {
    booking_confirmation: {
        id: 'booking_confirmation',
        label: 'Booking confirmation',
        description: 'Send a warm welcome as soon as a reservation is confirmed.',
        defaultTemplate:
            `Hi [Guest Name]! 👋\n` +
            `Thanks for booking [Property Name] — it’s confirmed! ✅\n` +
            `Your stay is from [Check-in Date] to [Check-out Date]. ` +
            `I’ll reach out with more details closer to check-in.\n\n` +
            `Let me know if you have any questions in the meantime! 😊`,
        sendDelayMinutes: 0,
    },
    check_in_instructions: {
        id: 'check_in_instructions',
        label: 'Check-in instructions',
        description: 'Remind guests about arrival details shortly before check-in.',
        defaultTemplate:
            `Hi [Guest Name],\n` +
            `We’re excited to host you tomorrow. Check-in starts at [Check-in Time].\n` +
            `Door/lockbox code: [Entry Code].\n` +
            `Wi‑Fi: [Wifi Name], Password: [Wifi Password].\n` +
            `Message me if you need anything else!`,
        sendDelayMinutes: 60,
    },
    check_out_note: {
        id: 'check_out_note',
        label: 'Checkout note',
        description: 'Send a friendly reminder about checkout and thank your guests.',
        defaultTemplate:
            `Good morning [Guest Name]!\n` +
            `Checkout is at [Checkout Time] today. Please leave the keys on the table and close the door behind you.\n` +
            `Hope you had a great stay – safe travels!`,
        sendDelayMinutes: 30,
    },
};

export const createDefaultAutomationSettings = () => ({
    events: Object.entries(DEFAULT_AUTOMATION_EVENTS).reduce((acc, [key, meta]) => {
        acc[key] = {
            ...meta,
            template: meta.defaultTemplate,
            enabled: key === 'booking_confirmation',
        };
        return acc;
    }, {}),
});

const safeParse = (value) => {
    if (!value) return null;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};

const getStorageKey = (hostId) => `${STORAGE_KEY_PREFIX}${hostId}`;
export const getAutomationStorageKey = (hostId) => getStorageKey(hostId);

export const loadAutomationSettings = (hostId) => {
    if (typeof window === 'undefined' || !hostId) {
        return createDefaultAutomationSettings();
    }
    const raw = window.localStorage.getItem(getStorageKey(hostId));
    const parsed = safeParse(raw);
    if (!parsed?.events) {
        return createDefaultAutomationSettings();
    }

    const defaults = createDefaultAutomationSettings();
    const mergedEvents = Object.keys(defaults.events).reduce((acc, eventKey) => {
        acc[eventKey] = {
            ...defaults.events[eventKey],
            ...parsed.events[eventKey],
            id: defaults.events[eventKey].id,
            label: defaults.events[eventKey].label,
            description: defaults.events[eventKey].description,
        };
        if (!acc[eventKey].template) {
            acc[eventKey].template = defaults.events[eventKey].defaultTemplate;
        }
        return acc;
    }, {});

    return { events: mergedEvents };
};

export const saveAutomationSettings = (hostId, settings) => {
    if (typeof window === 'undefined' || !hostId) return;
    const payload = JSON.stringify(settings);
    window.localStorage.setItem(getStorageKey(hostId), payload);
};

const loadSentRecords = () => {
    if (typeof window === 'undefined') return {};
    const raw = window.localStorage.getItem(SENT_RECORDS_KEY);
    return safeParse(raw) || {};
};

const persistSentRecords = (records) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SENT_RECORDS_KEY, JSON.stringify(records));
};

export const hasAutomationEventBeenSent = (bookingEventKey) => {
    if (!bookingEventKey) return false;
    const records = loadSentRecords();
    return Boolean(records[bookingEventKey]);
};

export const markAutomationEventSent = (bookingEventKey) => {
    if (!bookingEventKey) return;
    const records = loadSentRecords();
    records[bookingEventKey] = true;
    persistSentRecords(records);
};

export const personalizeTemplate = (
    template,
    {
        guestName = 'guest',
        propertyName = 'our place',
        checkInDate = '',
        checkOutDate = '',
        checkInTime = '',
        checkOutTime = '',
        wifiName = '',
        wifiPassword = '',
        entryCode = '',
    } = {}
) => {
    if (!template) return '';

    const replacements = {
        '\\[Guest Name\\]': guestName,
        '\\[Property Name\\]': propertyName,
        '\\[Check-in Date\\]': checkInDate,
        '\\[Check-out Date\\]': checkOutDate,
        '\\[Check-in Time\\]': checkInTime,
        '\\[Checkout Time\\]': checkOutTime,
        '\\[Wifi Name\\]': wifiName,
        '\\[Wifi Password\\]': wifiPassword,
        '\\[Entry Code\\]': entryCode,
    };

    let output = template;
    Object.entries(replacements).forEach(([placeholder, value]) => {
        const regex = new RegExp(placeholder, 'gi');
        output = output.replace(regex, value || '');
    });
    return output;
};

export const emitAutomationUpdated = (hostId) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent('domits-automation-updated', {
            detail: { hostId },
        })
    );
};


