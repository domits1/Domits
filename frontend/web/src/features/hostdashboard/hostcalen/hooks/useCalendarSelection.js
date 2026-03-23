import { useEffect, useMemo, useState } from "react";
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

const buildOverridePayload = (dateKeys, availabilityByKey, priceByKey) =>
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
      };
    })
    .filter(Boolean);

const parseOverrideResponse = (overrides) => {
  const availabilityByKey = {};
  const priceByKey = {};
  (Array.isArray(overrides) ? overrides : []).forEach((override) => {
    const key = dateNumberToKey(override?.date ?? override?.calendarDate);
    if (!key) {
      return;
    }
    if (override?.isAvailable !== null && override?.isAvailable !== undefined) {
      availabilityByKey[key] = Boolean(override.isAvailable);
    }
    const nightlyPrice = Number(override?.nightlyPrice);
    if (Number.isFinite(nightlyPrice) && nightlyPrice > 0) {
      priceByKey[key] = Math.trunc(nightlyPrice);
    }
  });
  return { availabilityByKey, priceByKey };
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
  const [selectionPriceInput, setSelectionPriceInput] = useState("");
  const [selectionPriceDirty, setSelectionPriceDirty] = useState(false);
  const [pendingSelectionStartKey, setPendingSelectionStartKey] = useState(null);
  const [selectedDateKeys, setSelectedDateKeys] = useState([]);

  const persistOverrides = async (propertyId, dateKeys, availabilityByKey, priceByKey) => {
    const token = getAccessToken();
    if (!token || !propertyId) {
      return false;
    }

    const overrides = buildOverridePayload(dateKeys, availabilityByKey, priceByKey);
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
    const { availabilityByKey: confirmedAvailability, priceByKey: confirmedPrice } = parseOverrideResponse(
      body?.overrides
    );

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
    () => priceOverridesByPropertyId?.[selectedPropertyId] || {},
    [priceOverridesByPropertyId, selectedPropertyId]
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

  useEffect(() => {
    if (!selectedDateKeys.length) {
      setSelectionPriceInput("");
      setSelectionPriceDirty(false);
      return;
    }

    const firstPrice = getDayPrice(selectedDateKeys[0]);
    const hasSamePrice = selectedDateKeys.every((key) => getDayPrice(key) === firstPrice);
    setSelectionPriceInput(hasSamePrice ? String(firstPrice) : "");
    setSelectionPriceDirty(false);
  }, [selectedDateKeys, selectedPropertyPriceOverrides, pricingSnapshot.nightlyRate, pricingSnapshot.weekendRate]);

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
        const { availabilityByKey, priceByKey } = parseOverrideResponse(body?.overrides);
        setAvailabilityOverrides(availabilityByKey);
        setPriceOverridesByPropertyId((previous) => ({
          ...previous,
          [selectedPropertyId]: priceByKey,
        }));
      } catch (error) {
        console.error(error?.message || error);
      }
    };

    loadOverrides();

    return () => {
      mounted = false;
    };
  }, [selectedPropertyId]);

  useEffect(() => {
    setAvailabilityOverrides({});
    setSelectionPriceInput("");
    setSelectionPriceDirty(false);
    setPendingSelectionStartKey(null);
    setSelectedDateKeys([]);
  }, [selectedPropertyId]);

  const resetSelectionState = () => {
    setAvailabilityOverrides({});
    setSelectionPriceInput("");
    setSelectionPriceDirty(false);
    setPendingSelectionStartKey(null);
    setSelectedDateKeys([]);
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

    setAvailabilityOverrides(nextAvailabilityOverrides);

    void persistOverrides(
      selectedPropertyId,
      keys,
      nextAvailabilityOverrides,
      selectedPropertyPriceOverrides
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
    setSelectionPriceDirty(false);

    void persistOverrides(
      selectedPropertyId,
      selectedDateKeys,
      availabilityOverrides,
      nextPropertyPriceOverrides
    ).catch((error) => {
      console.error(error?.message || error);
    });
  };

  return {
    availabilityOverrides,
    selectedPropertyPriceOverrides,
    selectedDateKeys,
    pendingSelectionStartKey,
    bookedDateKeys,
    selectedAvailabilityStats,
    selectionPriceInput,
    selectionPriceDirty,
    canSaveSelectionPrice,
    handleDateSelect,
    handleToggleAvailability,
    handleSelectionPriceChange,
    handleSaveSelectionPrice,
    resetSelectionState,
  };
};
