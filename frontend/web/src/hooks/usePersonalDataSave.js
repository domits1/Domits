import { useState } from "react";

const runSaveStep = async (save) => {
    try {
        return { status: "fulfilled", value: await save() };
    } catch (reason) {
        return { status: "rejected", reason };
    }
};

export default function usePersonalDataSave({
    user,
    tempUser,
    selectedCountryCode,
    stripPhone,
    onSaveUserName,
    onSaveUserEmail,
    onSaveUserPhone,
    onSaveProfileAttributes,
}) {
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState(false);

    const saveAll = async () => {
        const changedProfileKeys = [];

        if ((tempUser.dateOfBirth || "") !== (user.dateOfBirth || "")) {
            changedProfileKeys.push("dateOfBirth");
        }
        if ((tempUser.placeOfBirth || "") !== (user.placeOfBirth || "")) {
            changedProfileKeys.push("placeOfBirth");
        }
        if ((tempUser.nationality || "").trim() !== (user.nationality || "").trim()) {
            changedProfileKeys.push("nationality");
        }
        if ((tempUser.title || "") !== (user.title || "")) {
            changedProfileKeys.push("title");
        }
        if ((tempUser.sex || "") !== (user.sex || "")) {
            changedProfileKeys.push("sex");
        }

        const saveSteps = [];

        if (changedProfileKeys.length > 0) {
            saveSteps.push(() => onSaveProfileAttributes(changedProfileKeys));
        }
        if (
            (tempUser.firstName || "").trim() !== (user.firstName || "").trim() ||
            (tempUser.lastName || "").trim() !== (user.lastName || "").trim()
        ) {
            saveSteps.push(onSaveUserName);
        }
        const fullPhone = `${selectedCountryCode}${stripPhone || ""}`.trim();
        if (fullPhone !== (user.phone || "").trim()) {
            saveSteps.push(onSaveUserPhone);
        }
        if ((tempUser.email || "").trim() !== (user.email || "").trim()) {
            saveSteps.push(onSaveUserEmail);
        }

        setIsSaving(true);
        setSaveError(false);
        const results = [];
        for (const saveStep of saveSteps) {
            results.push(await runSaveStep(saveStep));
        }
        setIsSaving(false);

        const hasFailure = results.some(
            (result) => result.status === "rejected" || result.value === false
        );

        if (hasFailure) {
            setSaveError(true);
            setTimeout(() => setSaveError(false), 2500);
            return;
        }

        // saveUserEmail returns "pending" (not true) when it only started email
        // verification - that isn't a completed save, so don't claim "Saved!".
        const hasPending = results.some(
            (result) => result.status === "fulfilled" && result.value === "pending"
        );

        if (hasPending) {
            return;
        }

        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
    };

    return { saveAll, isSaving, saveSuccess, saveError };
}
