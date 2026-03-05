import { useEffect, useMemo, useState } from "react";

import { getAccessToken } from "../../../../services/getAccessToken";
import { PRICING_RESTRICTION_KEYS, PROPERTY_API_BASE, createInitialPricingForm } from "../../hostproperty/constants";
import { getApiErrorMessage } from "../../hostproperty/utils/hostPropertyUtils";
import {
  ADVANCE_NOTICE_RESTRICTION_KEYS,
  DEFAULT_ADVANCE_NOTICE_RESTRICTION_KEY,
  DEFAULT_MAX_ADVANCE_NOTICE_RESTRICTION_KEY,
  DEFAULT_PREPARATION_TIME_RESTRICTION_KEY,
  MAX_ADVANCE_NOTICE_RESTRICTION_KEYS,
  PREPARATION_TIME_RESTRICTION_KEYS,
  buildRestrictionValueMap,
  getAvailabilityWindowOptionsWithCurrent,
  mergeAvailabilityRestrictions,
  normalizeAvailabilitySettingsForm,
  resolveFirstRestrictionKey,
} from "./hostCalendarHelpers";

const createDefaultAvailabilityForm = () =>
  normalizeAvailabilitySettingsForm({
    minimumStay: 1,
    maximumStay: 0,
    advanceNoticeDays: 0,
    preparationTimeDays: 0,
    availabilityWindowDays: 365,
  });

export const useAvailabilitySettings = ({
  selectedPropertyId,
  propertyDetails,
  setPropertyDetails,
  pricingSnapshot,
}) => {
  const [availabilitySettingsForm, setAvailabilitySettingsForm] = useState(
    createDefaultAvailabilityForm()
  );
  const [availabilitySettingsSavedSnapshot, setAvailabilitySettingsSavedSnapshot] = useState(
    createDefaultAvailabilityForm()
  );
  const [isSavingAvailabilitySettings, setIsSavingAvailabilitySettings] = useState(false);
  const [availabilitySettingsSaveError, setAvailabilitySettingsSaveError] = useState("");

  const restrictionValueMap = useMemo(
    () => buildRestrictionValueMap(propertyDetails?.availabilityRestrictions),
    [propertyDetails?.availabilityRestrictions]
  );

  const advanceNoticeRestrictionKey = useMemo(
    () =>
      resolveFirstRestrictionKey(
        restrictionValueMap,
        ADVANCE_NOTICE_RESTRICTION_KEYS,
        DEFAULT_ADVANCE_NOTICE_RESTRICTION_KEY
      ),
    [restrictionValueMap]
  );

  const maxAdvanceRestrictionKey = useMemo(
    () =>
      resolveFirstRestrictionKey(
        restrictionValueMap,
        MAX_ADVANCE_NOTICE_RESTRICTION_KEYS,
        DEFAULT_MAX_ADVANCE_NOTICE_RESTRICTION_KEY
      ),
    [restrictionValueMap]
  );

  const preparationTimeRestrictionKey = useMemo(
    () =>
      resolveFirstRestrictionKey(
        restrictionValueMap,
        PREPARATION_TIME_RESTRICTION_KEYS,
        DEFAULT_PREPARATION_TIME_RESTRICTION_KEY
      ),
    [restrictionValueMap]
  );

  const normalizedAvailabilitySettings = useMemo(
    () => normalizeAvailabilitySettingsForm(availabilitySettingsForm),
    [availabilitySettingsForm]
  );

  const hasAvailabilitySettingsChanges = useMemo(
    () =>
      JSON.stringify(normalizedAvailabilitySettings) !==
      JSON.stringify(availabilitySettingsSavedSnapshot),
    [normalizedAvailabilitySettings, availabilitySettingsSavedSnapshot]
  );

  const canSaveAvailabilitySettings =
    hasAvailabilitySettingsChanges &&
    Boolean(selectedPropertyId) &&
    !isSavingAvailabilitySettings &&
    normalizedAvailabilitySettings.minimumStay >= 1 &&
    (normalizedAvailabilitySettings.maximumStay === 0 ||
      normalizedAvailabilitySettings.maximumStay >= normalizedAvailabilitySettings.minimumStay);

  const availabilityWindowOptions = useMemo(
    () => getAvailabilityWindowOptionsWithCurrent(normalizedAvailabilitySettings.availabilityWindowDays),
    [normalizedAvailabilitySettings.availabilityWindowDays]
  );

  useEffect(() => {
    if (!propertyDetails) {
      const fallbackPricingForm = createInitialPricingForm();
      const fallbackAvailabilityForm = normalizeAvailabilitySettingsForm({
        minimumStay: fallbackPricingForm.minimumStay,
        maximumStay: fallbackPricingForm.maximumStay,
        advanceNoticeDays: 0,
        preparationTimeDays: 0,
        availabilityWindowDays: 365,
      });
      setAvailabilitySettingsForm(fallbackAvailabilityForm);
      setAvailabilitySettingsSavedSnapshot(fallbackAvailabilityForm);
      setAvailabilitySettingsSaveError("");
      return;
    }

    const nextAvailabilityForm = normalizeAvailabilitySettingsForm({
      minimumStay: pricingSnapshot.minimumStay,
      maximumStay: pricingSnapshot.maximumStay,
      advanceNoticeDays: pricingSnapshot.advanceNoticeDays,
      preparationTimeDays: pricingSnapshot.preparationTimeDays,
      availabilityWindowDays: pricingSnapshot.maximumAdvanceDays || 365,
    });

    setAvailabilitySettingsForm(nextAvailabilityForm);
    setAvailabilitySettingsSavedSnapshot(nextAvailabilityForm);
    setAvailabilitySettingsSaveError("");
  }, [propertyDetails, pricingSnapshot]);

  const updateAvailabilitySettingsForm = (partialForm) => {
    if (!partialForm || typeof partialForm !== "object") {
      return;
    }
    setAvailabilitySettingsForm((previous) => ({
      ...previous,
      ...partialForm,
    }));
  };

  const handleSaveAvailabilitySettings = async () => {
    if (!canSaveAvailabilitySettings) {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setAvailabilitySettingsSaveError("Could not save availability. Please sign in again.");
      return;
    }

    const propertyTitle = String(propertyDetails?.property?.title || "").trim();
    const propertyDescription = String(propertyDetails?.property?.description || "").trim();
    const propertySubtitle = String(propertyDetails?.property?.subtitle || "").trim();
    if (!propertyTitle || !propertyDescription) {
      setAvailabilitySettingsSaveError(
        "Could not save availability because listing details are incomplete."
      );
      return;
    }

    const normalizedForm = normalizeAvailabilitySettingsForm(availabilitySettingsForm);

    const availabilityRestrictionsPayload = [
      {
        restriction: PRICING_RESTRICTION_KEYS.minimumStay,
        value: normalizedForm.minimumStay,
      },
      {
        restriction: PRICING_RESTRICTION_KEYS.maximumStay,
        value: normalizedForm.maximumStay,
      },
      advanceNoticeRestrictionKey
        ? {
            restriction: advanceNoticeRestrictionKey,
            value: normalizedForm.advanceNoticeDays,
          }
        : null,
      maxAdvanceRestrictionKey
        ? {
            restriction: maxAdvanceRestrictionKey,
            value: normalizedForm.availabilityWindowDays,
          }
        : null,
      preparationTimeRestrictionKey
        ? {
            restriction: preparationTimeRestrictionKey,
            value: normalizedForm.preparationTimeDays,
          }
        : null,
    ].filter(Boolean);

    setIsSavingAvailabilitySettings(true);
    setAvailabilitySettingsSaveError("");

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
          availabilityRestrictions: availabilityRestrictionsPayload,
        }),
      });

      if (!response.ok) {
        const apiError = await getApiErrorMessage(response, "Could not save availability settings.");
        throw new Error(apiError);
      }

      setAvailabilitySettingsForm(normalizedForm);
      setAvailabilitySettingsSavedSnapshot(normalizedForm);

      setPropertyDetails((previousDetails) => {
        if (!previousDetails || typeof previousDetails !== "object") {
          return previousDetails;
        }

        const nextRestrictions = mergeAvailabilityRestrictions(
          previousDetails.availabilityRestrictions,
          availabilityRestrictionsPayload
        );

        return {
          ...previousDetails,
          availabilityRestrictions: nextRestrictions,
        };
      });
    } catch (error) {
      setAvailabilitySettingsSaveError(error?.message || "Could not save availability settings.");
    } finally {
      setIsSavingAvailabilitySettings(false);
    }
  };

  return {
    availabilitySettingsForm,
    normalizedAvailabilitySettings,
    availabilityWindowOptions,
    hasAvailabilitySettingsChanges,
    canSaveAvailabilitySettings,
    isSavingAvailabilitySettings,
    availabilitySettingsSaveError,
    updateAvailabilitySettingsForm,
    handleSaveAvailabilitySettings,
  };
};
