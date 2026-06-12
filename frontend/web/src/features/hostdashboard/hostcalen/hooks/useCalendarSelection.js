import { useEffect, useMemo, useRef, useState } from "react";
import { getAccessToken } from "../../../../services/getAccessToken";
import { PROPERTY_API_BASE } from "../../hostproperty/constants";

import {
  getKeyRangeInclusive,
  keyToDateNumber,
  keyToUtcDate,
  utcDateToKey,
} from "./hostCalendarHelpers";

const dateNumberToKey = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "";
  }
  const normalized = String(Math.trunc(parsed));
  if (normalized.length !== 8) {
    return "";
  }
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}`;
};

const MIXED_RESTRICTION_VALUE = "mixed";
const INHERIT_RESTRICTION_VALUE = "inherit";
const TRUE_RESTRICTION_VALUE = "true";
const FALSE_RESTRICTION_VALUE = "false";
const EMPTY_PRICE_OVERRIDES = {};

const CALENDAR_RESTRICTION_FIELDS = [
  "stopSell",
  "closedToArrival",
  "closedToDeparture",
  "minStay",
  "maxStay",
];

const createEmptyRestrictionOverride = () => ({
  stopSell: null,
  closedToArrival: null,
  closedToDeparture: null,
  minStay: null,
  maxStay: null,
});

const createSelectionRestrictionsForm = () => ({
  stopSell: INHERIT_RESTRICTION_VALUE,
  closedToArrival: INHERIT_RESTRICTION_VALUE,
  closedToDeparture: INHERIT_RESTRICTION_VALUE,
  minStay: "",
  maxStay: "",
});

const normalizeNullableBoolean = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === TRUE_RESTRICTION_VALUE || normalized === "1") {
      return true;
    }
    if (normalized === FALSE_RESTRICTION_VALUE || normalized === "0") {
      return false;
    }
  }
  return null;
};

const normalizeNullableStay = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return Math.trunc(parsed);
};

const readOverrideField = (source, camelField, snakeField) => {
  if (!source || typeof source !== "object") {
    return undefined;
  }
  return source[camelField] === undefined ? source[snakeField] : source[camelField];
};

const normalizeRestrictionOverride = (source = {}) => ({
  stopSell: normalizeNullableBoolean(readOverrideField(source, "stopSell", "stop_sell")),
  closedToArrival: normalizeNullableBoolean(
    readOverrideField(source, "closedToArrival", "closed_to_arrival")
  ),
  closedToDeparture: normalizeNullableBoolean(
    readOverrideField(source, "closedToDeparture", "closed_to_departure")
  ),
  minStay: normalizeNullableStay(readOverrideField(source, "minStay", "min_stay")),
  maxStay: normalizeNullableStay(readOverrideField(source, "maxStay", "max_stay")),
});

const hasRestrictionOverrideValue = (restriction) =>
  CALENDAR_RESTRICTION_FIELDS.some((field) => restriction?.[field] !== null && restriction?.[field] !== undefined);

const hasDirtyFields = (dirtyFields) => (dirtyFields ? Object.values(dirtyFields).some(Boolean) : false);

const getSelectedDateKeySignature = (dateKeys) => (Array.isArray(dateKeys) ? dateKeys.join("|") : "");

const mergeServerMapPreservingKeys = (serverMap, previousMap, keysToPreserve) => {
  const next = serverMap ? { ...serverMap } : {};
  const previous = previousMap && typeof previousMap === "object" ? previousMap : null;
  (Array.isArray(keysToPreserve) ? keysToPreserve : []).forEach((key) => {
    if (previous && Object.hasOwn(previous, key)) {
      next[key] = previous[key];
    } else if (Object.hasOwn(next, key)) {
      delete next[key];
    }
  });
  return next;
};

const getRestrictionForKey = (restrictionsByKey, key) => {
  if (!restrictionsByKey || typeof restrictionsByKey !== "object") {
    return createEmptyRestrictionOverride();
  }
  return normalizeRestrictionOverride(restrictionsByKey[key]);
};

const buildOverridePayload = (dateKeys, availabilityByKey, priceByKey, restrictionsByKey) =>
  (Array.isArray(dateKeys) ? dateKeys : [])
    .map((key) => {
      const date = keyToDateNumber(key);
      if (!date) {
        return null;
      }
      const nightlyPriceRaw = Number(priceByKey?.[key]);
      const nightlyPrice =
        Number.isFinite(nightlyPriceRaw) && nightlyPriceRaw > 0 ? Math.trunc(nightlyPriceRaw) : null;
      return {
        date,
        isAvailable: Object.hasOwn(availabilityByKey, key) ? Boolean(availabilityByKey[key]) : null,
        nightlyPrice,
        ...getRestrictionForKey(restrictionsByKey, key),
      };
    })
    .filter(Boolean);

const parseOverrideResponse = (overrides) => {
  const availabilityByKey = {};
  const priceByKey = {};
  const priceLabsByKey = {};
  const restrictionsByKey = {};
  (Array.isArray(overrides) ? overrides : []).forEach((override) => {
    const key = dateNumberToKey(
      override?.date ?? readOverrideField(override, "calendarDate", "calendar_date")
    );
    if (!key) {
      return;
    }
    const isAvailable = readOverrideField(override, "isAvailable", "is_available");
    if (isAvailable !== null && isAvailable !== undefined) {
      availabilityByKey[key] = Boolean(isAvailable);
    }
    const nightlyPrice = Number(readOverrideField(override, "nightlyPrice", "nightly_price"));
    if (Number.isFinite(nightlyPrice) && nightlyPrice > 0) {
      priceByKey[key] = Math.trunc(nightlyPrice);
    }
    // PriceLabs price suggestion (set by webhook, requires host approval)
    const priceLabsPrice = Number(readOverrideField(override, "priceLabsPrice", "pricelabs_price"));
    if (Number.isFinite(priceLabsPrice) && priceLabsPrice > 0) {
      priceLabsByKey[key] = Math.trunc(priceLabsPrice);
    }
    const restriction = normalizeRestrictionOverride(override);
    if (hasRestrictionOverrideValue(restriction)) {
      restrictionsByKey[key] = restriction;
    }
  });
  return { availabilityByKey, priceByKey, priceLabsByKey, restrictionsByKey };
};

const valuesAreEqual = (left, right) => left === right;

const resolveCommonRestrictionValue = (dateKeys, restrictionsByKey, field) => {
  const keys = Array.isArray(dateKeys) ? dateKeys : [];
  if (!keys.length) {
    return null;
  }

  const firstValue = getRestrictionForKey(restrictionsByKey, keys[0])?.[field] ?? null;
  const hasMixedValues = keys.some((key) => {
    const value = getRestrictionForKey(restrictionsByKey, key)?.[field] ?? null;
    return !valuesAreEqual(value, firstValue);
  });

  return hasMixedValues ? MIXED_RESTRICTION_VALUE : firstValue;
};

const toBooleanFormValue = (value) => {
  if (value === MIXED_RESTRICTION_VALUE) {
    return MIXED_RESTRICTION_VALUE;
  }
  if (value === true) {
    return TRUE_RESTRICTION_VALUE;
  }
  if (value === false) {
    return FALSE_RESTRICTION_VALUE;
  }
  return INHERIT_RESTRICTION_VALUE;
};

const buildSelectionRestrictionSnapshot = (dateKeys, restrictionsByKey) => {
  const stopSell = resolveCommonRestrictionValue(dateKeys, restrictionsByKey, "stopSell");
  const closedToArrival = resolveCommonRestrictionValue(dateKeys, restrictionsByKey, "closedToArrival");
  const closedToDeparture = resolveCommonRestrictionValue(dateKeys, restrictionsByKey, "closedToDeparture");
  const minStay = resolveCommonRestrictionValue(dateKeys, restrictionsByKey, "minStay");
  const maxStay = resolveCommonRestrictionValue(dateKeys, restrictionsByKey, "maxStay");

  return {
    form: {
      stopSell: toBooleanFormValue(stopSell),
      closedToArrival: toBooleanFormValue(closedToArrival),
      closedToDeparture: toBooleanFormValue(closedToDeparture),
      minStay: minStay === MIXED_RESTRICTION_VALUE || minStay === null ? "" : String(minStay),
      maxStay: maxStay === MIXED_RESTRICTION_VALUE || maxStay === null ? "" : String(maxStay),
    },
    mixedFields: {
      stopSell: stopSell === MIXED_RESTRICTION_VALUE,
      closedToArrival: closedToArrival === MIXED_RESTRICTION_VALUE,
      closedToDeparture: closedToDeparture === MIXED_RESTRICTION_VALUE,
      minStay: minStay === MIXED_RESTRICTION_VALUE,
      maxStay: maxStay === MIXED_RESTRICTION_VALUE,
    },
  };
};

const isValidOptionalStayInput = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return true;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
};

const formBooleanToRestrictionValue = (value) => {
  if (value === TRUE_RESTRICTION_VALUE) {
    return true;
  }
  if (value === FALSE_RESTRICTION_VALUE) {
    return false;
  }
  return null;
};

const formStayToRestrictionValue = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return null;
  }
  return Math.trunc(Number(value));
};

export const useCalendarSelection = ({
  cursor,
  monthGrid,
  selectedPropertyId,
  pricingSnapshot,
  availabilityRanges,
  externalBlockedDates,
  bookedDateKeysByPropertyId,
}) => {
  const [availabilityOverrides, setAvailabilityOverrides] = useState({});
  const [priceOverridesByPropertyId, setPriceOverridesByPropertyId] = useState({});
  const [priceLabsOverridesByPropertyId, setPriceLabsOverridesByPropertyId] = useState({});
  const [restrictionOverrides, setRestrictionOverrides] = useState({});
  const [reloadKey, setReloadKey] = useState(0);
  const [selectionPriceInput, setSelectionPriceInput] = useState("");
  const [selectionPriceDirty, setSelectionPriceDirty] = useState(false);
  const [selectionRestrictionsForm, setSelectionRestrictionsForm] = useState(
    createSelectionRestrictionsForm
  );
  const [selectionRestrictionDirtyFields, setSelectionRestrictionDirtyFields] = useState({});
  const [pendingSelectionStartKey, setPendingSelectionStartKey] = useState(null);
  const [selectedDateKeys, setSelectedDateKeys] = useState([]);
  const latestSelectedDateKeysRef = useRef([]);
  const localOverrideVersionRef = useRef(0);
  const restrictionDraftSelectionKeyRef = useRef("");

  const markLocalOverrideTouched = () => {
    localOverrideVersionRef.current += 1;
  };

  useEffect(() => {
    latestSelectedDateKeysRef.current = Array.isArray(selectedDateKeys) ? selectedDateKeys : [];
  }, [selectedDateKeys]);

  const persistOverrides = async (
    propertyId,
    dateKeys,
    availabilityByKey,
    priceByKey,
    restrictionsByKey
  ) => {
    const token = getAccessToken();
    if (!token || !propertyId) {
      return false;
    }

    const overrides = buildOverridePayload(dateKeys, availabilityByKey, priceByKey, restrictionsByKey);
    if (!overrides.length) {
      return false;
    }

    const response = await fetch(`${PROPERTY_API_BASE}/calendar/overrides`, {
      method: "PATCH",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        propertyId,
        overrides,
      }),
    });

    if (!response.ok) {
      throw new Error(`Could not save date overrides (${response.status}).`);
    }

    const body = await response.json();
    const {
      availabilityByKey: confirmedAvailability,
      priceByKey: confirmedPrice,
      priceLabsByKey: confirmedPriceLabs,
      restrictionsByKey: confirmedRestrictions,
    } = parseOverrideResponse(body?.overrides);

    setAvailabilityOverrides((previous) => {
      const next = { ...previous };
      dateKeys.forEach((key) => {
        if (Object.hasOwn(next, key)) {
          delete next[key];
        }
      });
      Object.entries(confirmedAvailability).forEach(([key, value]) => {
        next[key] = value;
      });
      return next;
    });

    setPriceOverridesByPropertyId((previous) => {
      const next = { ...previous };
      const existing = next[propertyId];
      const propertyPrices = existing && typeof existing === "object" ? { ...existing } : {};
      dateKeys.forEach((key) => {
        if (Object.hasOwn(propertyPrices, key)) {
          delete propertyPrices[key];
        }
      });
      Object.entries(confirmedPrice).forEach(([key, value]) => {
        propertyPrices[key] = value;
      });
      next[propertyId] = propertyPrices;
      return next;
    });

    setPriceLabsOverridesByPropertyId((previous) => {
      const next = { ...previous };
      const existing = next[propertyId];
      const propertyPriceLabs = existing && typeof existing === "object" ? { ...existing } : {};
      Object.entries(confirmedPriceLabs).forEach(([key, value]) => {
        propertyPriceLabs[key] = value;
      });
      next[propertyId] = propertyPriceLabs;
      return next;
    });

    setRestrictionOverrides((previous) => {
      const next = { ...previous };
      dateKeys.forEach((key) => {
        if (Object.hasOwn(next, key)) {
          delete next[key];
        }
      });
      Object.entries(confirmedRestrictions).forEach(([key, value]) => {
        next[key] = value;
      });
      return next;
    });

    return true;
  };

  const currentMonthKeys = useMemo(() => {
    const keys = (Array.isArray(monthGrid) ? monthGrid : [])
      .flat()
      .filter((date) => {
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth();
        return year === cursor.getUTCFullYear() && month === cursor.getUTCMonth();
      })
      .map((date) => utcDateToKey(date));
    return new Set(keys);
  }, [monthGrid, cursor]);

  const bookedDateKeys = useMemo(
    () => new Set(bookedDateKeysByPropertyId?.[selectedPropertyId] || []),
    [bookedDateKeysByPropertyId, selectedPropertyId]
  );

  const selectedPropertyPriceOverrides = useMemo(
    () => priceOverridesByPropertyId?.[selectedPropertyId] || EMPTY_PRICE_OVERRIDES,
    [priceOverridesByPropertyId, selectedPropertyId]
  );

  const selectedPropertyPriceLabsOverrides = useMemo(
    () => priceLabsOverridesByPropertyId?.[selectedPropertyId] || EMPTY_PRICE_OVERRIDES,
    [priceLabsOverridesByPropertyId, selectedPropertyId]
  );

  const getBasePriceForDateKey = (key) => {
    const date = keyToUtcDate(key);
    if (!date) {
      return pricingSnapshot.nightlyRate;
    }
    const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
    return isWeekend ? pricingSnapshot.weekendRate : pricingSnapshot.nightlyRate;
  };

  const getDayPrice = (key) => {
    const override = Number(selectedPropertyPriceOverrides[key]);
    if (Number.isFinite(override) && override > 0) {
      return Math.trunc(override);
    }
    return getBasePriceForDateKey(key);
  };

  const isDateAvailable = (key) => {
    if (externalBlockedDates.has(key) || bookedDateKeys.has(key)) {
      return false;
    }

    if (Object.hasOwn(availabilityOverrides, key)) {
      return Boolean(availabilityOverrides[key]);
    }

    const dateNumber = keyToDateNumber(key);
    if (!dateNumber) {
      return false;
    }

    if (!availabilityRanges.length) {
      return true;
    }

    return availabilityRanges.some((range) => dateNumber >= range.start && dateNumber <= range.end);
  };

  const selectedAvailabilityStats = useMemo(() => {
    const keys = Array.isArray(selectedDateKeys) ? selectedDateKeys : [];
    if (!keys.length) {
      return { total: 0, available: 0, allAvailable: false };
    }

    const availableCount = keys.reduce((count, key) => count + (isDateAvailable(key) ? 1 : 0), 0);

    return {
      total: keys.length,
      available: availableCount,
      allAvailable: availableCount === keys.length,
    };
  }, [selectedDateKeys, availabilityRanges, availabilityOverrides, externalBlockedDates, bookedDateKeys]);

  const parsedSelectionPriceInput = Number(selectionPriceInput);
  const canSaveSelectionPrice =
    selectionPriceDirty &&
    selectedDateKeys.length > 0 &&
    Number.isFinite(parsedSelectionPriceInput) &&
    parsedSelectionPriceInput >= 2;
  const selectionRestrictionsDirty = hasDirtyFields(selectionRestrictionDirtyFields);
  const selectedDateKeySignature = useMemo(
    () => getSelectedDateKeySignature(selectedDateKeys),
    [selectedDateKeys]
  );

  useEffect(() => {
    if (!selectedDateKeys.length) {
      setSelectionPriceInput("");
      setSelectionPriceDirty(false);
      setSelectionRestrictionsForm(createSelectionRestrictionsForm());
      setSelectionRestrictionDirtyFields({});
      return;
    }

    const firstPrice = getDayPrice(selectedDateKeys[0]);
    const hasSamePrice = selectedDateKeys.every((key) => getDayPrice(key) === firstPrice);
    setSelectionPriceInput(hasSamePrice ? String(firstPrice) : "");
    setSelectionPriceDirty(false);
  }, [selectedDateKeys, selectedPropertyPriceOverrides, pricingSnapshot.nightlyRate, pricingSnapshot.weekendRate]);

  const selectedRestrictionSnapshot = useMemo(
    () => buildSelectionRestrictionSnapshot(selectedDateKeys, restrictionOverrides),
    [selectedDateKeys, restrictionOverrides]
  );

  useEffect(() => {
    if (!selectedDateKeySignature) {
      restrictionDraftSelectionKeyRef.current = "";
      setSelectionRestrictionsForm(createSelectionRestrictionsForm());
      setSelectionRestrictionDirtyFields({});
      return;
    }

    const selectedDatesChanged = restrictionDraftSelectionKeyRef.current !== selectedDateKeySignature;
    if (!selectedDatesChanged && selectionRestrictionsDirty) {
      return;
    }

    restrictionDraftSelectionKeyRef.current = selectedDateKeySignature;
    setSelectionRestrictionsForm(selectedRestrictionSnapshot.form);
    setSelectionRestrictionDirtyFields({});
  }, [selectedDateKeySignature, selectedRestrictionSnapshot, selectionRestrictionsDirty]);

  useEffect(() => {
    let mounted = true;

    const loadOverrides = async () => {
      if (!selectedPropertyId) {
        return;
      }
      const token = getAccessToken();
      if (!token) {
        return;
      }
      const requestStartedAtLocalVersion = localOverrideVersionRef.current;

      try {
        const response = await fetch(
          `${PROPERTY_API_BASE}/calendar/overrides?propertyId=${encodeURIComponent(selectedPropertyId)}`,
          {
            method: "GET",
            headers: {
              Authorization: token,
            },
          }
        );
        if (!response.ok) {
          throw new Error(`Could not load date overrides (${response.status}).`);
        }
        const body = await response.json();
        if (!mounted) {
          return;
        }
        const { availabilityByKey, priceByKey, priceLabsByKey, restrictionsByKey } = parseOverrideResponse(body?.overrides);
        const localOverridesChangedDuringRequest =
          localOverrideVersionRef.current !== requestStartedAtLocalVersion;
        const selectedKeysToPreserve = localOverridesChangedDuringRequest
          ? latestSelectedDateKeysRef.current
          : [];

        setAvailabilityOverrides((previous) =>
          localOverridesChangedDuringRequest
            ? mergeServerMapPreservingKeys(availabilityByKey, previous, selectedKeysToPreserve)
            : availabilityByKey
        );
        setRestrictionOverrides((previous) =>
          localOverridesChangedDuringRequest
            ? mergeServerMapPreservingKeys(restrictionsByKey, previous, selectedKeysToPreserve)
            : restrictionsByKey
        );
        setPriceOverridesByPropertyId((previous) => ({
          ...previous,
          [selectedPropertyId]: localOverridesChangedDuringRequest
            ? mergeServerMapPreservingKeys(
                priceByKey,
                previous?.[selectedPropertyId],
                selectedKeysToPreserve
              )
            : priceByKey,
        }));
        setPriceLabsOverridesByPropertyId((previous) => ({
          ...previous,
          [selectedPropertyId]: priceLabsByKey,
        }));
      } catch (error) {
        console.error(error?.message || error);
      }
    };

    loadOverrides();

    return () => {
      mounted = false;
    };
  }, [selectedPropertyId, reloadKey]);

  useEffect(() => {
    setAvailabilityOverrides({});
    setRestrictionOverrides({});
    setPriceLabsOverridesByPropertyId({});
    setSelectionPriceInput("");
    setSelectionPriceDirty(false);
    setSelectionRestrictionsForm(createSelectionRestrictionsForm());
    setSelectionRestrictionDirtyFields({});
    setPendingSelectionStartKey(null);
    setSelectedDateKeys([]);
    restrictionDraftSelectionKeyRef.current = "";
  }, [selectedPropertyId]);

  const resetSelectionState = () => {
    setAvailabilityOverrides({});
    setRestrictionOverrides({});
    setSelectionPriceInput("");
    setSelectionPriceDirty(false);
    setSelectionRestrictionsForm(createSelectionRestrictionsForm());
    setSelectionRestrictionDirtyFields({});
    setPendingSelectionStartKey(null);
    setSelectedDateKeys([]);
    restrictionDraftSelectionKeyRef.current = "";
  };

  const handleDateSelect = (dateContext) => {
    const key = String(dateContext?.key || "");
    if (!key) {
      return;
    }
    if (!currentMonthKeys.has(key)) {
      return;
    }

    if (pendingSelectionStartKey) {
      if (pendingSelectionStartKey === key) {
        setSelectedDateKeys([key]);
      } else {
        const nextKeys = getKeyRangeInclusive(pendingSelectionStartKey, key).filter((currentKey) =>
          currentMonthKeys.has(currentKey)
        );
        setSelectedDateKeys(nextKeys);
      }
      setPendingSelectionStartKey(null);
      return;
    }

    if (selectedDateKeys.length > 0) {
      setSelectedDateKeys([]);
      setPendingSelectionStartKey(key);
      return;
    }

    setPendingSelectionStartKey(key);
  };

  const handleToggleAvailability = (nextAvailability) => {
    const keys = Array.isArray(selectedDateKeys) ? selectedDateKeys : [];
    if (!keys.length) {
      return;
    }

    const nextAvailabilityOverrides = { ...availabilityOverrides };
    keys.forEach((key) => {
      if (!externalBlockedDates.has(key) && !bookedDateKeys.has(key)) {
        nextAvailabilityOverrides[key] = Boolean(nextAvailability);
      }
    });

    markLocalOverrideTouched();
    setAvailabilityOverrides(nextAvailabilityOverrides);

    void persistOverrides(
      selectedPropertyId,
      keys,
      nextAvailabilityOverrides,
      selectedPropertyPriceOverrides,
      restrictionOverrides
    ).catch((error) => {
      console.error(error?.message || error);
    });
  };

  const handleSelectionPriceChange = (nextValue) => {
    setSelectionPriceInput(nextValue);
    setSelectionPriceDirty(true);
  };

  const handleSaveSelectionPrice = () => {
    if (!canSaveSelectionPrice || !selectedPropertyId) {
      return;
    }

    const value = Math.trunc(parsedSelectionPriceInput);
    const nextPropertyPriceOverrides = { ...selectedPropertyPriceOverrides };
    selectedDateKeys.forEach((key) => {
      if (!externalBlockedDates.has(key) && !bookedDateKeys.has(key)) {
        nextPropertyPriceOverrides[key] = value;
      }
    });

    setPriceOverridesByPropertyId((previous) => ({
      ...previous,
      [selectedPropertyId]: nextPropertyPriceOverrides,
    }));
    markLocalOverrideTouched();
    setSelectionPriceDirty(false);

    void persistOverrides(
      selectedPropertyId,
      selectedDateKeys,
      availabilityOverrides,
      nextPropertyPriceOverrides,
      restrictionOverrides
    ).catch((error) => {
      console.error(error?.message || error);
    });
  };

  const handleIgnorePriceLabsSuggestion = (dateKeys) => {
    if (!selectedPropertyId || !dateKeys?.length) {
      return;
    }
    // Remove the PriceLabs suggestion from local state for these dates.
    // The suggestion will reappear only after the next PriceLabs sync.
    setPriceLabsOverridesByPropertyId((previous) => {
      const existing = previous?.[selectedPropertyId];
      if (!existing) return previous;
      const next = { ...existing };
      dateKeys.forEach((key) => {
        delete next[key];
      });
      return { ...previous, [selectedPropertyId]: next };
    });
  };

  const handleApplyPriceLabsSuggestion = (dateKeys) => {
    if (!selectedPropertyId || !dateKeys?.length) {
      return;
    }

    // For each selected date, copy the pricelabs_price into nightly_price.
    const nextPropertyPriceOverrides = { ...selectedPropertyPriceOverrides };
    const keysToApply = [];

    dateKeys.forEach((key) => {
      if (externalBlockedDates.has(key) || bookedDateKeys.has(key)) {
        return;
      }
      const labsPrice = Number(selectedPropertyPriceLabsOverrides[key]);
      if (Number.isFinite(labsPrice) && labsPrice > 0) {
        nextPropertyPriceOverrides[key] = Math.trunc(labsPrice);
        keysToApply.push(key);
      }
    });

    if (!keysToApply.length) {
      return;
    }

    setPriceOverridesByPropertyId((previous) => ({
      ...previous,
      [selectedPropertyId]: nextPropertyPriceOverrides,
    }));
    markLocalOverrideTouched();

    void persistOverrides(
      selectedPropertyId,
      keysToApply,
      availabilityOverrides,
      nextPropertyPriceOverrides,
      restrictionOverrides
    ).catch((error) => {
      console.error(error?.message || error);
    });
  };

  const handleSelectionRestrictionChange = (field, nextValue) => {
    if (!CALENDAR_RESTRICTION_FIELDS.includes(field)) {
      return;
    }
    setSelectionRestrictionsForm((previous) => ({
      ...previous,
      [field]: nextValue,
    }));
    setSelectionRestrictionDirtyFields((previous) => ({
      ...previous,
      [field]: true,
    }));
    markLocalOverrideTouched();
  };

  const canSaveSelectionRestrictions =
    selectionRestrictionsDirty &&
    selectedDateKeys.length > 0 &&
    isValidOptionalStayInput(selectionRestrictionsForm.minStay) &&
    isValidOptionalStayInput(selectionRestrictionsForm.maxStay);

  const handleSaveSelectionRestrictions = () => {
    if (!canSaveSelectionRestrictions || !selectedPropertyId) {
      return;
    }

    const nextRestrictionOverrides = { ...restrictionOverrides };
    selectedDateKeys.forEach((key) => {
      const nextRestriction = getRestrictionForKey(nextRestrictionOverrides, key);

      if (selectionRestrictionDirtyFields.stopSell) {
        nextRestriction.stopSell = formBooleanToRestrictionValue(selectionRestrictionsForm.stopSell);
      }
      if (selectionRestrictionDirtyFields.closedToArrival) {
        nextRestriction.closedToArrival = formBooleanToRestrictionValue(
          selectionRestrictionsForm.closedToArrival
        );
      }
      if (selectionRestrictionDirtyFields.closedToDeparture) {
        nextRestriction.closedToDeparture = formBooleanToRestrictionValue(
          selectionRestrictionsForm.closedToDeparture
        );
      }
      if (selectionRestrictionDirtyFields.minStay) {
        nextRestriction.minStay = formStayToRestrictionValue(selectionRestrictionsForm.minStay);
      }
      if (selectionRestrictionDirtyFields.maxStay) {
        nextRestriction.maxStay = formStayToRestrictionValue(selectionRestrictionsForm.maxStay);
      }

      if (hasRestrictionOverrideValue(nextRestriction)) {
        nextRestrictionOverrides[key] = nextRestriction;
      } else if (Object.hasOwn(nextRestrictionOverrides, key)) {
        delete nextRestrictionOverrides[key];
      }
    });

    markLocalOverrideTouched();
    setRestrictionOverrides(nextRestrictionOverrides);
    setSelectionRestrictionDirtyFields({});

    void persistOverrides(
      selectedPropertyId,
      selectedDateKeys,
      availabilityOverrides,
      selectedPropertyPriceOverrides,
      nextRestrictionOverrides
    ).catch((error) => {
      console.error(error?.message || error);
    });
  };

  return {
    availabilityOverrides,
    restrictionOverrides,
    selectedPropertyPriceOverrides,
    selectedPropertyPriceLabsOverrides,
    selectedDateKeys,
    pendingSelectionStartKey,
    bookedDateKeys,
    selectedAvailabilityStats,
    selectionPriceInput,
    selectionPriceDirty,
    canSaveSelectionPrice,
    selectionRestrictionsForm,
    selectionRestrictionMixedFields: selectedRestrictionSnapshot.mixedFields,
    selectionRestrictionsDirty,
    canSaveSelectionRestrictions,
    handleDateSelect,
    handleToggleAvailability,
    handleSelectionPriceChange,
    handleSaveSelectionPrice,
    handleApplyPriceLabsSuggestion,
    handleIgnorePriceLabsSuggestion,
    handleSelectionRestrictionChange,
    handleSaveSelectionRestrictions,
    resetSelectionState,
    reloadOverrides: () => setReloadKey((k) => k + 1),
  };
};
