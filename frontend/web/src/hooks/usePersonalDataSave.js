import { useState } from "react";

export default function usePersonalDataSave({
    user,
    tempUser,
    selectedCountryCode,
    stripPhone,
    onSaveUserName,
    onSaveUserEmail,
    onSaveUserPhone,
    onSaveUserDateOfBirth,
    onSaveUserPlaceOfBirth,
    onSaveUserNationality,
    onSaveUserTitle,
    onSaveUserSex,
}) {
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState(false);

    const saveAll = async () => {
        const saves = [];

        if (
            (tempUser.firstName || "").trim() !== (user.firstName || "").trim() ||
            (tempUser.lastName || "").trim() !== (user.lastName || "").trim()
        ) {
            saves.push(onSaveUserName());
        }
        if ((tempUser.email || "").trim() !== (user.email || "").trim()) {
            saves.push(onSaveUserEmail());
        }
        const fullPhone = `${selectedCountryCode}${stripPhone || ""}`.trim();
        if (fullPhone !== (user.phone || "").trim()) {
            saves.push(onSaveUserPhone());
        }
        if ((tempUser.dateOfBirth || "") !== (user.dateOfBirth || "")) {
            saves.push(onSaveUserDateOfBirth());
        }
        if ((tempUser.placeOfBirth || "") !== (user.placeOfBirth || "")) {
            saves.push(onSaveUserPlaceOfBirth());
        }
        if ((tempUser.nationality || "").trim() !== (user.nationality || "").trim()) {
            saves.push(onSaveUserNationality());
        }
        if ((tempUser.title || "") !== (user.title || "")) {
            saves.push(onSaveUserTitle());
        }
        if ((tempUser.sex || "") !== (user.sex || "")) {
            saves.push(onSaveUserSex());
        }

        setIsSaving(true);
        setSaveError(false);
        const results = await Promise.allSettled(saves);
        setIsSaving(false);

        const hasFailure = results.some(
            (result) => result.status === "rejected" || result.value === false
        );

        if (hasFailure) {
            setSaveError(true);
            setTimeout(() => setSaveError(false), 2500);
            return;
        }

        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
    };

    return { saveAll, isSaving, saveSuccess, saveError };
}
