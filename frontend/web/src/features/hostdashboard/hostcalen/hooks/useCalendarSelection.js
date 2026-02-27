import { useEffect, useMemo, useState } from "react";

import {
  getKeyRangeInclusive,
  keyToDateNumber,
  keyToUtcDate,
  utcDateToKey,
} from "./hostCalendarHelpers";

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

    setAvailabilityOverrides((previousOverrides) => {
      const nextOverrides = { ...previousOverrides };
      keys.forEach((key) => {
        if (!externalBlockedDates.has(key) && !bookedDateKeys.has(key)) {
          nextOverrides[key] = Boolean(nextAvailability);
        }
      });
      return nextOverrides;
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
    setPriceOverridesByPropertyId((previous) => {
      const next = { ...previous };
      const propertyOverrides = { ...(next[selectedPropertyId] || {}) };
      selectedDateKeys.forEach((key) => {
        if (!externalBlockedDates.has(key) && !bookedDateKeys.has(key)) {
          propertyOverrides[key] = value;
        }
      });
      next[selectedPropertyId] = propertyOverrides;
      return next;
    });
    setSelectionPriceDirty(false);
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
