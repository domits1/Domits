import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchCompanyProfile, saveCompanyProfile } from "../components/settings/api/companyProfile";

const EMPTY_PROFILE = {
    companyName: "",
    displayName: "",
    logoUrl: "",
    description: "",
    website: "",
    publicEmail: "",
    publicPhone: "",
    country: "",
};

const toComparable = (profile) => JSON.stringify(profile);

export default function useCompanyProfile() {
    const [profile, setProfile] = useState(EMPTY_PROFILE);
    const [baseline, setBaseline] = useState(EMPTY_PROFILE);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const loadProfile = async () => {
            setIsLoading(true);
            setError("");
            setSaveSuccess(false);

            try {
                const loaded = await fetchCompanyProfile();
                if (!isMounted) return;
                setProfile({ ...EMPTY_PROFILE, ...loaded });
                setBaseline({ ...EMPTY_PROFILE, ...loaded });
            } catch {
                if (!isMounted) return;
                setError("We could not load your company information. Please try again.");
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadProfile();

        return () => {
            isMounted = false;
        };
    }, []);

    const isDirty = useMemo(() => toComparable(profile) !== toComparable(baseline), [profile, baseline]);

    const updateField = useCallback((field, value) => {
        setProfile((prev) => ({ ...prev, [field]: value }));
        setSaveSuccess(false);
        setError("");
    }, []);

    const save = useCallback(async () => {
        if (isLoading || isSaving || !isDirty) return;

        setIsSaving(true);
        setError("");
        setSaveSuccess(false);

        try {
            const saved = await saveCompanyProfile(profile);
            setProfile({ ...EMPTY_PROFILE, ...saved });
            setBaseline({ ...EMPTY_PROFILE, ...saved });
            setSaveSuccess(true);
        } catch {
            setError("We could not save your company information. Your changes are still here.");
        } finally {
            setIsSaving(false);
        }
    }, [isDirty, isLoading, isSaving, profile]);

    return {
        profile,
        updateField,
        isLoading,
        isSaving,
        isDirty,
        saveSuccess,
        error,
        save,
    };
}
