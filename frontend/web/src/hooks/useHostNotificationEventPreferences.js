import { useCallback, useEffect, useMemo, useState } from "react";
import {
    fetchHostNotificationEventPreferences,
    saveHostNotificationEventPreferences,
} from "../components/settings/api/communicationPreferences";

const CHANNEL_KEYS = ["inApp", "email", "sms"];

const isCompletePreferences = (candidate, categories) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return false;
    const events = categories.flatMap((category) => category.events || []);
    return events.length > 0 && events.every(({ key }) =>
        candidate[key] && typeof candidate[key] === "object" && !Array.isArray(candidate[key]) &&
        CHANNEL_KEYS.every((channel) => typeof candidate[key][channel] === "boolean")
    );
};

const clonePreferences = (preferences) => Object.fromEntries(
    Object.entries(preferences).map(([eventKey, channels]) => [
        eventKey,
        { ...channels },
    ])
);

export default function useHostNotificationEventPreferences(messages) {
    const [categories, setCategories] = useState([]);
    const [preferences, setPreferences] = useState({});
    const [baseline, setBaseline] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [error, setError] = useState("");
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        let isMounted = true;

        const load = async () => {
            setIsLoading(true);
            setLoadError("");
            setError("");
            setSaveSuccess(false);
            try {
                const result = await fetchHostNotificationEventPreferences();
                if (!Array.isArray(result?.categories) || !isCompletePreferences(result?.preferences, result.categories)) {
                    throw new Error("INVALID_HOST_NOTIFICATION_PREFERENCES_RESPONSE");
                }
                if (!isMounted) return;
                const loadedPreferences = clonePreferences(result.preferences);
                setCategories(result.categories);
                setPreferences(loadedPreferences);
                setBaseline(loadedPreferences);
            } catch (error) {
                if (isMounted) setLoadError(error?.message === "INVALID_HOST_NOTIFICATION_PREFERENCES_RESPONSE" ? messages.invalidResponse : messages.loadFailed);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        void load();
        return () => {
            isMounted = false;
        };
    }, [retryCount]);

    const isDirty = useMemo(
        () => JSON.stringify(preferences) !== JSON.stringify(baseline),
        [preferences, baseline]
    );

    const updatePreference = useCallback((eventKey, channelKey, enabled) => {
        setPreferences((current) => ({
            ...current,
            [eventKey]: { ...current[eventKey], [channelKey]: enabled },
        }));
        setSaveSuccess(false);
        setError("");
    }, []);

    const save = useCallback(async () => {
        if (isLoading || isSaving || loadError || !isDirty) return;
        setIsSaving(true);
        setError("");
        setSaveSuccess(false);
        try {
            const saved = await saveHostNotificationEventPreferences(preferences);
            const savedMatrix = saved?.preferences ?? saved;
            const nextPreferences = isCompletePreferences(savedMatrix, categories) ? savedMatrix : preferences;
            const normalized = clonePreferences(nextPreferences);
            setPreferences(normalized);
            setBaseline(normalized);
            setSaveSuccess(true);
        } catch {
            setError(messages.saveFailed);
        } finally {
            setIsSaving(false);
        }
    }, [categories, isDirty, isLoading, isSaving, loadError, messages, preferences]);

    const retry = useCallback(() => setRetryCount((count) => count + 1), []);

    return {
        categories,
        preferences,
        updatePreference,
        isLoading,
        isSaving,
        loadError,
        error,
        saveSuccess,
        isDirty,
        onSave: save,
        onRetry: retry,
    };
}
