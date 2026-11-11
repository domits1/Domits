import { useCallback, useEffect, useMemo, useState } from "react";
import {
    fetchHostNotificationEventPreferences,
    saveHostNotificationEventPreferences,
} from "../components/settings/api/communicationPreferences";

const clonePreferences = (preferences) => Object.fromEntries(
    Object.entries(preferences).map(([eventKey, channels]) => [
        eventKey,
        { ...channels },
    ])
);

export default function useHostNotificationEventPreferences() {
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
                if (!Array.isArray(result?.categories) || !result?.preferences) {
                    throw new Error("Invalid host notification preferences response.");
                }
                if (!isMounted) return;
                const loadedPreferences = clonePreferences(result.preferences);
                setCategories(result.categories);
                setPreferences(loadedPreferences);
                setBaseline(loadedPreferences);
            } catch {
                if (isMounted) setLoadError("We could not load your notification choices. Retry before making changes.");
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
            const normalized = clonePreferences(saved);
            setPreferences(normalized);
            setBaseline(normalized);
            setSaveSuccess(true);
        } catch {
            setError("We could not save your notification choices. Your changes are still here.");
        } finally {
            setIsSaving(false);
        }
    }, [isDirty, isLoading, isSaving, loadError, preferences]);

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
