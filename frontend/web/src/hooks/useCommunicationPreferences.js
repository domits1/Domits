import { useCallback, useEffect, useMemo, useState } from "react";
import {
    fetchCommunicationPreferences,
    saveCommunicationPreferences,
} from "../components/settings/api/communicationPreferences";
import {
    DEFAULT_NOTIFICATION_PREFERENCES,
    enforceRequiredCommunicationPreferences,
} from "../components/settings/communicationPreferencesConfig";

const toComparable = (preferences) => JSON.stringify(enforceRequiredCommunicationPreferences(preferences));

const cloneDefaults = () => enforceRequiredCommunicationPreferences(DEFAULT_NOTIFICATION_PREFERENCES);

export default function useCommunicationPreferences(persona) {
    const [preferences, setPreferences] = useState(cloneDefaults);
    const [baseline, setBaseline] = useState(cloneDefaults);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const loadPreferences = async () => {
            setIsLoading(true);
            setError("");
            setSaveSuccess(false);

            try {
                const loaded = await fetchCommunicationPreferences(persona);
                if (!isMounted) return;
                setPreferences(loaded);
                setBaseline(loaded);
            } catch {
                if (!isMounted) return;
                const defaults = cloneDefaults();
                setPreferences(defaults);
                setBaseline(defaults);
                setError("We could not load your communication preferences. Please try again.");
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadPreferences();

        return () => {
            isMounted = false;
        };
    }, [persona]);

    const normalizedPreferences = useMemo(
        () => enforceRequiredCommunicationPreferences(preferences),
        [preferences]
    );

    const isDirty = useMemo(
        () => toComparable(normalizedPreferences) !== toComparable(baseline),
        [baseline, normalizedPreferences]
    );

    const updatePreferences = useCallback((nextPreferences) => {
        setPreferences(enforceRequiredCommunicationPreferences(nextPreferences));
        setSaveSuccess(false);
        setError("");
    }, []);

    const save = useCallback(async () => {
        if (isLoading || isSaving || !isDirty) return;

        setIsSaving(true);
        setError("");
        setSaveSuccess(false);

        try {
            const saved = await saveCommunicationPreferences(persona, normalizedPreferences);
            setPreferences(saved);
            setBaseline(saved);
            setSaveSuccess(true);
        } catch {
            setError("We could not save your communication preferences. Your changes are still here.");
        } finally {
            setIsSaving(false);
        }
    }, [isDirty, isLoading, isSaving, normalizedPreferences, persona]);

    return {
        preferences: normalizedPreferences,
        setPreferences: updatePreferences,
        onPreferencesChange: updatePreferences,
        isLoading,
        isSaving,
        isDirty,
        saveSuccess,
        error,
        save,
        onSave: save,
    };
}
