import { Auth } from "aws-amplify";
import { enforceRequiredCommunicationPreferences } from "../communicationPreferencesConfig";

export const COMMUNICATION_PREFERENCES_ENDPOINT =
    process.env.REACT_APP_COMMUNICATION_PREFERENCES_API_URL || "/user/communication-preferences";

export const normalizeCommunicationPreferencesPersona = (persona) => {
    const normalized = String(persona || "").trim().toLowerCase();
    if (!["host", "guest"].includes(normalized)) {
        throw new Error("Communication preferences persona must be host or guest.");
    }
    return normalized;
};

export const buildCommunicationPreferencesUrl = (persona) =>
    `${COMMUNICATION_PREFERENCES_ENDPOINT}?persona=${encodeURIComponent(normalizeCommunicationPreferencesPersona(persona))}`;

const getIdToken = async () => {
    const session = await Auth.currentSession();
    const token = session.getIdToken().getJwtToken();

    if (!token) {
        throw new Error("Authentication is required.");
    }

    return token;
};

const requestCommunicationPreferences = async ({ method, body, persona, errorMessage } = {}) => {
    const token = await getIdToken();
    const response = await fetch(buildCommunicationPreferencesUrl(persona), {
        method,
        cache: "no-store",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(errorMessage);
    }

    return enforceRequiredCommunicationPreferences(payload);
};

export const fetchCommunicationPreferences = (persona) =>
    requestCommunicationPreferences({
        method: "GET",
        persona,
        errorMessage: "We could not load your communication preferences. Please try again.",
    });

export const saveCommunicationPreferences = (persona, preferences) =>
    requestCommunicationPreferences({
        method: "PUT",
        persona,
        body: enforceRequiredCommunicationPreferences(preferences),
        errorMessage: "We could not save your communication preferences. Please try again.",
    });
