import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchCompliancePropertyOptions, saveRegistrationNumber } from "../services/complianceApi";
import { getSaveErrorKey, isRegistrationNumberValid, toDisplayRegistrationNumber } from "../utils/registrationNumber";

export default function useComplianceSettings() {
    const [properties, setProperties] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasLoadError, setHasLoadError] = useState(false);
    const [selectedPropertyId, setSelectedPropertyId] = useState("");
    const [registrationNumber, setRegistrationNumber] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [errorKey, setErrorKey] = useState("");

    useEffect(() => {
        let isMounted = true;

        const loadProperties = async () => {
            try {
                const options = await fetchCompliancePropertyOptions();
                if (!isMounted) return;
                setProperties(options);
                if (options.length > 0) {
                    setSelectedPropertyId(options[0].id);
                    setRegistrationNumber(toDisplayRegistrationNumber(options[0].registrationNumber));
                }
            } catch {
                if (isMounted) setHasLoadError(true);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadProperties();

        return () => {
            isMounted = false;
        };
    }, []);

    const selectedProperty = useMemo(
        () => properties.find((property) => property.id === selectedPropertyId) || null,
        [properties, selectedPropertyId]
    );

    const savedRegistrationNumber = toDisplayRegistrationNumber(selectedProperty?.registrationNumber);
    const isRegistrationNumberUnavailable = selectedProperty !== null && !selectedProperty.registrationNumberAvailable;
    const isDirty =
        selectedProperty !== null &&
        !isRegistrationNumberUnavailable &&
        registrationNumber.trim() !== savedRegistrationNumber;

    const selectProperty = useCallback(
        (propertyId) => {
            const nextProperty = properties.find((property) => property.id === propertyId);
            if (!nextProperty) return;
            setSelectedPropertyId(nextProperty.id);
            setRegistrationNumber(toDisplayRegistrationNumber(nextProperty.registrationNumber));
            setSaveSuccess(false);
            setErrorKey("");
        },
        [properties]
    );

    const updateRegistrationNumber = useCallback((value) => {
        setRegistrationNumber(value);
        setSaveSuccess(false);
        setErrorKey("");
    }, []);

    const save = useCallback(async () => {
        if (!selectedProperty || isSaving || !isDirty) return;

        if (!isRegistrationNumberValid(registrationNumber)) {
            setErrorKey("validation");
            return;
        }

        setIsSaving(true);
        setErrorKey("");
        setSaveSuccess(false);

        try {
            const saved = await saveRegistrationNumber(selectedProperty.id, registrationNumber.trim());
            setProperties((current) =>
                current.map((property) =>
                    property.id === selectedProperty.id
                        ? { ...property, registrationNumber: saved.registrationNumber }
                        : property
                )
            );
            setRegistrationNumber(toDisplayRegistrationNumber(saved.registrationNumber));
            setSaveSuccess(true);
        } catch (error) {
            setErrorKey(getSaveErrorKey(error));
        } finally {
            setIsSaving(false);
        }
    }, [isDirty, isSaving, registrationNumber, selectedProperty]);

    return {
        properties,
        isLoading,
        hasLoadError,
        selectedPropertyId,
        selectProperty,
        registrationNumber,
        updateRegistrationNumber,
        hasSavedRegistrationNumber: savedRegistrationNumber !== "",
        isRegistrationNumberUnavailable,
        isDirty,
        isSaving,
        saveSuccess,
        errorKey,
        save,
    };
}
