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

export const REQUIRED_COMMUNICATION_PREFERENCES = {
    reservation: { email: true },
    cancellation: { email: true },
};

export const enforceRequiredCommunicationPreferences = (preferences = DEFAULT_NOTIFICATION_PREFERENCES) => ({
    reservation: {
        email: true,
        sms: Boolean(preferences?.reservation?.sms),
        push: Boolean(preferences?.reservation?.push),
    },
    cancellation: {
        email: true,
        sms: Boolean(preferences?.cancellation?.sms),
        push: Boolean(preferences?.cancellation?.push),
    },
    messages: {
        email: Boolean(preferences?.messages?.email),
        sms: Boolean(preferences?.messages?.sms),
        push: Boolean(preferences?.messages?.push),
    },
});
