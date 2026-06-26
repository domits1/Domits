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
}) {
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

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

        setIsSaving(true);
        await Promise.allSettled(saves);
        setIsSaving(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
    };

    return { saveAll, isSaving, saveSuccess };
}
