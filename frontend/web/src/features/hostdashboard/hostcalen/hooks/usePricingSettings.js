import { useEffect, useMemo, useState } from "react";

import { getAccessToken } from "../../../../services/getAccessToken";
import {
  PRICING_MIN_NIGHTLY_RATE_FOR_SAVE,
  PROPERTY_API_BASE,
  createInitialPricingForm,
} from "../../hostproperty/constants";
import {
  buildPricingRestrictionsPayload,
  getApiErrorMessage,
  mapPropertyPricingToState,
  normalizePricingForm,
} from "../../hostproperty/utils/hostPropertyUtils";
import { buildComparablePricingSettings, mergeAvailabilityRestrictions } from "./hostCalendarHelpers";

export const usePricingSettings = ({
  selectedPropertyId,
  propertyDetails,
  setPropertyDetails,
  pricingSnapshot,
}) => {
  const [pricingSettingsForm, setPricingSettingsForm] = useState(createInitialPricingForm());
  const [pricingSettingsSavedSnapshot, setPricingSettingsSavedSnapshot] = useState(
    normalizePricingForm(createInitialPricingForm())
  );
  const [weekendRateInput, setWeekendRateInput] = useState("");
  const [weekendRateSavedSnapshot, setWeekendRateSavedSnapshot] = useState(0);
  const [isSavingPricingSettings, setIsSavingPricingSettings] = useState(false);
  const [pricingSettingsSaveError, setPricingSettingsSaveError] = useState("");

  const normalizedPricingSettingsForm = useMemo(
    () => normalizePricingForm(pricingSettingsForm),
    [pricingSettingsForm]
  );

  const comparablePricingSettingsForm = useMemo(
    () => buildComparablePricingSettings(normalizedPricingSettingsForm),
    [normalizedPricingSettingsForm]
  );

  const comparablePricingSettingsSnapshot = useMemo(
    () => buildComparablePricingSettings(pricingSettingsSavedSnapshot),
    [pricingSettingsSavedSnapshot]
  );

  const hasPricingSettingsChanges = useMemo(
    () =>
      JSON.stringify(comparablePricingSettingsForm) !==
      JSON.stringify(comparablePricingSettingsSnapshot),
    [comparablePricingSettingsForm, comparablePricingSettingsSnapshot]
  );

  const parsedWeekendRateInput = Number(weekendRateInput);
  const normalizedWeekendRateInput = Number.isFinite(parsedWeekendRateInput)
    ? Math.trunc(parsedWeekendRateInput)
    : 0;
  const hasWeekendRateChanges = normalizedWeekendRateInput !== weekendRateSavedSnapshot;
  const hasAnyPricingSettingsChanges = hasPricingSettingsChanges || hasWeekendRateChanges;

  const canSavePricingSettings =
    hasAnyPricingSettingsChanges &&
    normalizedPricingSettingsForm.nightlyRate >= PRICING_MIN_NIGHTLY_RATE_FOR_SAVE &&
    normalizedWeekendRateInput >= PRICING_MIN_NIGHTLY_RATE_FOR_SAVE &&
    Boolean(selectedPropertyId) &&
    !isSavingPricingSettings;

  useEffect(() => {
    if (!propertyDetails) {
      const fallbackPricingForm = createInitialPricingForm();
      setPricingSettingsForm(fallbackPricingForm);
      setPricingSettingsSavedSnapshot(normalizePricingForm(fallbackPricingForm));
      setWeekendRateInput(String(fallbackPricingForm.nightlyRate));
      setWeekendRateSavedSnapshot(fallbackPricingForm.nightlyRate);
      setPricingSettingsSaveError("");
      return;
    }

    const nextPricingForm = mapPropertyPricingToState(
      propertyDetails?.pricing || {},
      propertyDetails?.availabilityRestrictions || []
    );

    setPricingSettingsForm(nextPricingForm);
    setPricingSettingsSavedSnapshot(normalizePricingForm(nextPricingForm));
    setWeekendRateInput(String(pricingSnapshot.weekendRate));
    setWeekendRateSavedSnapshot(pricingSnapshot.weekendRate);
    setPricingSettingsSaveError("");
  }, [propertyDetails, pricingSnapshot]);

  const updatePricingSettingsForm = (partialForm) => {
    if (!partialForm || typeof partialForm !== "object") {
      return;
    }
    setPricingSettingsForm((previous) => ({
      ...previous,
      ...partialForm,
    }));
  };

  const handleSavePricingSettings = async () => {
    if (!canSavePricingSettings) {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setPricingSettingsSaveError("Could not save pricing. Please sign in again.");
      return;
    }

    const propertyTitle = String(propertyDetails?.property?.title || "").trim();
    const propertyDescription = String(propertyDetails?.property?.description || "").trim();
    const propertySubtitle = String(propertyDetails?.property?.subtitle || "").trim();
    if (!propertyTitle || !propertyDescription) {
      setPricingSettingsSaveError("Could not save pricing because listing details are incomplete.");
      return;
    }

    const normalizedForm = normalizePricingForm(pricingSettingsForm);
    if (normalizedForm.nightlyRate < PRICING_MIN_NIGHTLY_RATE_FOR_SAVE) {
      setPricingSettingsSaveError(
        `Nightly rate must be at least EUR ${PRICING_MIN_NIGHTLY_RATE_FOR_SAVE}.`
      );
      return;
    }
    if (normalizedWeekendRateInput < PRICING_MIN_NIGHTLY_RATE_FOR_SAVE) {
      setPricingSettingsSaveError(
        `Weekend rate must be at least EUR ${PRICING_MIN_NIGHTLY_RATE_FOR_SAVE}.`
      );
      return;
    }

    const availabilityRestrictionsPayload = buildPricingRestrictionsPayload(normalizedForm);

    setIsSavingPricingSettings(true);
    setPricingSettingsSaveError("");

    try {
      const response = await fetch(`${PROPERTY_API_BASE}/overview`, {
        method: "PATCH",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyId: selectedPropertyId,
          title: propertyTitle,
          subtitle: propertySubtitle,
          description: propertyDescription,
          pricing: {
            roomRate: normalizedForm.nightlyRate,
            weekendRate: normalizedWeekendRateInput,
          },
          availabilityRestrictions: availabilityRestrictionsPayload,
        }),
      });

      if (!response.ok) {
        const apiError = await getApiErrorMessage(response, "Could not save pricing settings.");
        throw new Error(apiError);
      }

      setPricingSettingsForm(normalizedForm);
      setPricingSettingsSavedSnapshot(normalizePricingForm(normalizedForm));
      setWeekendRateInput(String(normalizedWeekendRateInput));
      setWeekendRateSavedSnapshot(normalizedWeekendRateInput);
      setPropertyDetails((previousDetails) => {
        if (!previousDetails || typeof previousDetails !== "object") {
          return previousDetails;
        }

        const previousPricing =
          previousDetails.pricing && typeof previousDetails.pricing === "object"
            ? previousDetails.pricing
            : {};
        const nextRestrictions = mergeAvailabilityRestrictions(
          previousDetails.availabilityRestrictions,
          availabilityRestrictionsPayload
        );

        return {
          ...previousDetails,
          pricing: {
            ...previousPricing,
            roomRate: normalizedForm.nightlyRate,
            roomrate: normalizedForm.nightlyRate,
            weekendRate: normalizedWeekendRateInput,
            weekendrate: normalizedWeekendRateInput,
          },
          availabilityRestrictions: nextRestrictions,
        };
      });
    } catch (error) {
      setPricingSettingsSaveError(error?.message || "Could not save pricing settings.");
    } finally {
      setIsSavingPricingSettings(false);
    }
  };

  return {
    pricingSettingsForm,
    normalizedPricingSettingsForm,
    weekendRateInput,
    hasAnyPricingSettingsChanges,
    canSavePricingSettings,
    isSavingPricingSettings,
    pricingSettingsSaveError,
    updatePricingSettingsForm,
    setWeekendRateInput,
    handleSavePricingSettings,
  };
};
