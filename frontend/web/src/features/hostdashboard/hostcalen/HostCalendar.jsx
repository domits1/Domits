import React, { useEffect, useMemo, useState } from "react";
import "./HostCalendar.scss";

import Toolbar from "./components/Toolbar";
import CalendarGrid from "./components/CalendarGrid";
import PulseBarsLoader from "./components/PulseBarsLoader";
import AvailabilityCard from "./components/Sidebar/AvailabilityCard";
import PricingCard from "./components/Sidebar/PricingCard";
import PricingSettingsCard from "./components/Sidebar/PricingSettingsCard";
import SelectionCard from "./components/Sidebar/SelectionCard";

import {
  addMonthsUTC,
  getMonthMatrix,
  startOfMonthUTC,
  subMonthsUTC,
} from "./utils/date";
import { getAccessToken, getCognitoUserId } from "../../../services/getAccessToken";
import { dbListIcalSources } from "../../../utils/icalRetrieveHost";
import {
  PRICING_MIN_NIGHTLY_RATE_FOR_SAVE,
  PRICING_RESTRICTION_KEYS,
  PROPERTY_API_BASE,
  createInitialPricingForm,
} from "../hostproperty/constants";
import {
  buildPricingRestrictionsPayload,
  getApiErrorMessage,
  mapPropertyPricingToState,
  normalizePricingForm,
} from "../hostproperty/utils/hostPropertyUtils";
import getReservationsFromToken from "../services/getReservationsFromToken";

const ADVANCE_NOTICE_RESTRICTION_KEYS = [
  "MinimumAdvanceReservation",
  "MinimumAdvanceNoticeDays",
  "MinimumAdvanceBookingDays",
];

const WEEKEND_PRICE_KEYS = ["weekendRate", "weekendrate", "weekendPrice", "weekendprice"];
const BOOKING_EXCLUDED_STATUSES = new Set(["failed", "cancelled", "canceled", "denied", "rejected"]);

const toInteger = (value, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.trunc(numeric);
};

const toPositiveInteger = (value, fallback = 0) => {
  const parsed = toInteger(value, fallback);
  return parsed > 0 ? parsed : fallback;
};

const buildRestrictionValueMap = (availabilityRestrictions) =>
  new Map(
    (Array.isArray(availabilityRestrictions) ? availabilityRestrictions : [])
      .map((entry) => {
        const key = String(entry?.restriction || "").trim();
        if (!key) {
          return null;
        }
        return [key, toInteger(entry?.value, 0)];
      })
      .filter(Boolean)
  );

const readRestrictionValue = (restrictionMap, key, fallback = 0) => {
  if (!restrictionMap.has(key)) {
    return fallback;
  }
  return toInteger(restrictionMap.get(key), fallback);
};

const readFirstRestrictionValue = (restrictionMap, keys, fallback = 0) => {
  const safeKeys = Array.isArray(keys) ? keys : [];
  for (const key of safeKeys) {
    if (restrictionMap.has(key)) {
      return toInteger(restrictionMap.get(key), fallback);
    }
  }
  return fallback;
};

const readFirstPricingValue = (pricing, keys, fallback = 0) => {
  const safePricing = pricing && typeof pricing === "object" ? pricing : {};
  const safeKeys = Array.isArray(keys) ? keys : [];
  for (const key of safeKeys) {
    if (safePricing[key] !== undefined) {
      const parsed = toInteger(safePricing[key], fallback);
      if (parsed > 0) {
        return parsed;
      }
    }
  }
  return fallback;
};

const normalizeDateNumber = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  const truncated = Math.trunc(numeric);
  if (truncated >= 10000101 && truncated <= 99991231) {
    return truncated;
  }

  const milliseconds = truncated > 1000000000000 ? truncated : truncated * 1000;
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return Number(`${year}${month}${day}`);
};

const normalizeAvailabilityRanges = (availability) =>
  (Array.isArray(availability) ? availability : [])
    .map((entry) => {
      const start = normalizeDateNumber(entry?.availableStartDate ?? entry?.availablestartdate);
      const end = normalizeDateNumber(entry?.availableEndDate ?? entry?.availableenddate);
      if (!start || !end) {
        return null;
      }
      return start <= end ? { start, end } : { start: end, end: start };
    })
    .filter(Boolean)
    .sort((left, right) => left.start - right.start);

const keyToDateNumber = (key) => {
  if (typeof key !== "string") {
    return null;
  }
  const parts = key.split("-");
  if (parts.length !== 3) {
    return null;
  }
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return year * 10000 + month * 100 + day;
};

const keyToUtcDate = (key) => {
  if (typeof key !== "string") {
    return null;
  }
  const parts = key.split("-");
  if (parts.length !== 3) {
    return null;
  }
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return new Date(Date.UTC(year, month - 1, day));
};

const utcDateToKey = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getKeyRangeInclusive = (startKey, endKey) => {
  const startDate = keyToUtcDate(startKey);
  const endDate = keyToUtcDate(endKey);
  if (!startDate || !endDate) {
    return [];
  }

  const from = startDate <= endDate ? startDate : endDate;
  const to = startDate <= endDate ? endDate : startDate;
  const keys = [];

  const cursor = new Date(from);
  while (cursor <= to) {
    keys.push(utcDateToKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return keys;
};

const normalizeStatus = (value) => String(value || "").trim().toUpperCase();

const resolveStatusTone = (status) => {
  if (normalizeStatus(status) === "ACTIVE") {
    return "ACTIVE";
  }
  if (normalizeStatus(status) === "ARCHIVED") {
    return "ARCHIVED";
  }
  return "INACTIVE";
};

const normalizeTimestampLike = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    const milliseconds = numeric > 1000000000000 ? numeric : numeric * 1000;
    const parsedDate = new Date(milliseconds);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }

  const parsedFromString = new Date(String(value));
  if (!Number.isNaN(parsedFromString.getTime())) {
    return parsedFromString;
  }
  return null;
};

const startOfUtcDay = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const isBookedStatus = (status) => !BOOKING_EXCLUDED_STATUSES.has(String(status || "").trim().toLowerCase());

const buildBookedDateMap = (bookingsPayload) => {
  const source = Array.isArray(bookingsPayload) ? bookingsPayload : [];
  const accumulator = {};

  source.forEach((propertyBookings) => {
    const propertyId = String(
      propertyBookings?.id || propertyBookings?.property_id || propertyBookings?.propertyId || ""
    ).trim();

    if (!propertyId) {
      return;
    }

    const reservations = Array.isArray(propertyBookings?.res?.response)
      ? propertyBookings.res.response
      : [];
    const dateKeys = new Set(accumulator[propertyId] || []);

    reservations.forEach((reservation) => {
      if (!isBookedStatus(reservation?.status)) {
        return;
      }

      const arrival = normalizeTimestampLike(
        reservation?.arrivaldate ?? reservation?.arrivalDate ?? reservation?.arrival_date
      );
      const departure = normalizeTimestampLike(
        reservation?.departuredate ?? reservation?.departureDate ?? reservation?.departure_date
      );
      if (!arrival || !departure) {
        return;
      }

      const from = startOfUtcDay(arrival);
      const toExclusive = startOfUtcDay(departure);
      if (toExclusive <= from) {
        dateKeys.add(utcDateToKey(from));
        return;
      }

      const cursor = new Date(from);
      while (cursor < toExclusive) {
        dateKeys.add(utcDateToKey(cursor));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    });

    accumulator[propertyId] = Array.from(dateKeys);
  });

  return accumulator;
};

const getListingLabel = (listing) => {
  const title = String(listing?.property?.title || "Untitled listing");
  const city = String(listing?.propertyLocation?.city || listing?.location?.city || "").trim();
  const country = String(listing?.propertyLocation?.country || listing?.location?.country || "").trim();
  const locationSuffix = [city, country].filter(Boolean).join(", ");
  return locationSuffix ? `${title} - ${locationSuffix}` : title;
};

const buildPricingSnapshot = (propertyDetails) => {
  const defaultPricingForm = createInitialPricingForm();
  const pricing = propertyDetails?.pricing || {};
  const restrictionMap = buildRestrictionValueMap(propertyDetails?.availabilityRestrictions);

  const nightlyRate = toPositiveInteger(
    pricing?.roomRate ?? pricing?.roomrate,
    defaultPricingForm.nightlyRate
  );
  const weekendRate = readFirstPricingValue(pricing, WEEKEND_PRICE_KEYS, nightlyRate);

  const minimumStay = Math.max(
    1,
    readRestrictionValue(
      restrictionMap,
      PRICING_RESTRICTION_KEYS.minimumStay,
      defaultPricingForm.minimumStay
    )
  );

  const maximumStayRaw = Math.max(
    0,
    readRestrictionValue(
      restrictionMap,
      PRICING_RESTRICTION_KEYS.maximumStay,
      defaultPricingForm.maximumStay
    )
  );

  return {
    nightlyRate,
    weekendRate,
    weeklyDiscountPercent: Math.max(
      0,
      readRestrictionValue(restrictionMap, PRICING_RESTRICTION_KEYS.weeklyDiscountPercent, 0)
    ),
    monthlyDiscountPercent: Math.max(
      0,
      readRestrictionValue(restrictionMap, PRICING_RESTRICTION_KEYS.monthlyDiscountPercent, 0)
    ),
    minimumStay,
    maximumStay: maximumStayRaw === 0 ? 0 : Math.max(minimumStay, maximumStayRaw),
    advanceNoticeDays: Math.max(
      0,
      readFirstRestrictionValue(restrictionMap, ADVANCE_NOTICE_RESTRICTION_KEYS, 0)
    ),
  };
};

const mergeAvailabilityRestrictions = (existingRestrictions, updates) => {
  const existing = Array.isArray(existingRestrictions) ? existingRestrictions : [];
  const nextByRestriction = new Map(
    existing
      .map((entry) => {
        const restriction = String(entry?.restriction || "").trim();
        if (!restriction) {
          return null;
        }
        return [
          restriction,
          {
            ...entry,
            restriction,
            value: toInteger(entry?.value, 0),
          },
        ];
      })
      .filter(Boolean)
  );

  (Array.isArray(updates) ? updates : []).forEach((entry) => {
    const restriction = String(entry?.restriction || "").trim();
    if (!restriction) {
      return;
    }
    nextByRestriction.set(restriction, {
      ...(nextByRestriction.get(restriction) || {}),
      restriction,
      value: Math.max(0, toInteger(entry?.value, 0)),
    });
  });

  return Array.from(nextByRestriction.values());
};

export default function HostCalendar() {
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(startOfMonthUTC(new Date()));

  const [accommodations, setAccommodations] = useState([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [listingsError, setListingsError] = useState("");

  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [propertyDetails, setPropertyDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const [externalBlockedDates, setExternalBlockedDates] = useState(new Set());
  const [availabilityOverrides, setAvailabilityOverrides] = useState({});
  const [priceOverridesByPropertyId, setPriceOverridesByPropertyId] = useState({});
  const [selectionPriceInput, setSelectionPriceInput] = useState("");
  const [selectionPriceDirty, setSelectionPriceDirty] = useState(false);
  const [pendingSelectionStartKey, setPendingSelectionStartKey] = useState(null);
  const [selectedDateKeys, setSelectedDateKeys] = useState([]);
  const [bookedDateKeysByPropertyId, setBookedDateKeysByPropertyId] = useState({});
  const [sidebarMode, setSidebarMode] = useState("summary");
  const [pricingSettingsForm, setPricingSettingsForm] = useState(createInitialPricingForm());
  const [pricingSettingsSavedSnapshot, setPricingSettingsSavedSnapshot] = useState(
    normalizePricingForm(createInitialPricingForm())
  );
  const [isSavingPricingSettings, setIsSavingPricingSettings] = useState(false);
  const [pricingSettingsSaveError, setPricingSettingsSaveError] = useState("");
  const [weekendRateInput, setWeekendRateInput] = useState("");
  const [weekendRateSavedSnapshot, setWeekendRateSavedSnapshot] = useState(0);

  const monthGrid = useMemo(() => getMonthMatrix(cursor), [cursor]);
  const availabilityRanges = useMemo(
    () => normalizeAvailabilityRanges(propertyDetails?.availability),
    [propertyDetails]
  );

  const pricingSnapshot = useMemo(
    () => buildPricingSnapshot(propertyDetails),
    [propertyDetails]
  );

  const listingOptions = useMemo(
    () =>
      accommodations
        .map((listing) => {
          const id = String(listing?.property?.id || "").trim();
          if (!id) {
            return null;
          }
          return {
            value: id,
            label: getListingLabel(listing),
            status: resolveStatusTone(listing?.property?.status),
          };
        })
        .filter(Boolean),
    [accommodations]
  );

  const currentMonthKeys = useMemo(() => {
    const keys = monthGrid
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
    () => new Set(bookedDateKeysByPropertyId[selectedPropertyId] || []),
    [bookedDateKeysByPropertyId, selectedPropertyId]
  );

  const selectedPropertyPriceOverrides = useMemo(
    () => priceOverridesByPropertyId[selectedPropertyId] || {},
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

  const selectedAvailabilityStats = (() => {
    const keys = Array.isArray(selectedDateKeys) ? selectedDateKeys : [];
    if (!keys.length) {
      return { total: 0, available: 0, allAvailable: false };
    }

    const availableCount = keys.reduce(
      (count, key) => count + (isDateAvailable(key) ? 1 : 0),
      0
    );

    return {
      total: keys.length,
      available: availableCount,
      allAvailable: availableCount === keys.length,
    };
  })();

  const parsedSelectionPriceInput = Number(selectionPriceInput);
  const canSaveSelectionPrice =
    selectionPriceDirty &&
    selectedDateKeys.length > 0 &&
    Number.isFinite(parsedSelectionPriceInput) &&
    parsedSelectionPriceInput >= 2;

  const normalizedPricingSettingsForm = useMemo(
    () => normalizePricingForm(pricingSettingsForm),
    [pricingSettingsForm]
  );

  const hasPricingSettingsChanges = useMemo(
    () =>
      JSON.stringify(normalizedPricingSettingsForm) !==
      JSON.stringify(pricingSettingsSavedSnapshot),
    [normalizedPricingSettingsForm, pricingSettingsSavedSnapshot]
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

  const prev = () => setCursor((currentCursor) => subMonthsUTC(currentCursor, 1));
  const next = () => setCursor((currentCursor) => addMonthsUTC(currentCursor, 1));
  const today = () => setCursor(startOfMonthUTC(new Date()));

  useEffect(() => {
    let mounted = true;

    const loadListings = async () => {
      const hostId = getCognitoUserId();
      const token = getAccessToken();

      if (!token) {
        if (mounted) {
          setIsLoadingListings(false);
          setListingsError("Could not load host listings. Please sign in again.");
        }
        return;
      }

      setIsLoadingListings(true);
      setListingsError("");

      try {
        const allResponse = await fetch(`${PROPERTY_API_BASE}/hostDashboard/all`, {
          method: "GET",
          headers: {
            Authorization: token,
          },
        });

        let listings = [];

        if (allResponse.ok) {
          const allData = await allResponse.json();
          listings = Array.isArray(allData) ? allData : [];
        } else {
          if (!hostId) {
            throw new Error(`Could not load listings (${allResponse.status}).`);
          }
          const fallbackUrl = new URL(`${PROPERTY_API_BASE}/bookingEngine/byHostId`);
          fallbackUrl.searchParams.set("hostId", hostId);
          const fallbackResponse = await fetch(fallbackUrl.toString(), {
            method: "GET",
            headers: {
              Authorization: token,
            },
          });

          if (!fallbackResponse.ok) {
            throw new Error(`Could not load listings (${fallbackResponse.status}).`);
          }
          const fallbackData = await fallbackResponse.json();
          listings = Array.isArray(fallbackData) ? fallbackData : [];
        }

        if (!mounted) {
          return;
        }

        setAccommodations(listings);
        setSelectedPropertyId((currentPropertyId) => {
          if (
            currentPropertyId &&
            listings.some((listing) => String(listing?.property?.id) === currentPropertyId)
          ) {
            return currentPropertyId;
          }

          return String(listings?.[0]?.property?.id || "");
        });
      } catch (error) {
        if (!mounted) {
          return;
        }
        setAccommodations([]);
        setSelectedPropertyId("");
        setListingsError(error?.message || "Could not load host listings.");
      } finally {
        if (mounted) {
          setIsLoadingListings(false);
        }
      }
    };

    loadListings();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadBookings = async () => {
      const token = getAccessToken();
      if (!token) {
        return;
      }

      try {
        const bookingsPayload = await getReservationsFromToken(token);
        if (!mounted || bookingsPayload === "Data not found") {
          return;
        }
        setBookedDateKeysByPropertyId(buildBookedDateMap(bookingsPayload));
      } catch {
        if (mounted) {
          setBookedDateKeysByPropertyId({});
        }
      }
    };

    loadBookings();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadPropertyDetails = async () => {
      if (!selectedPropertyId) {
        if (mounted) {
          setPropertyDetails(null);
          setExternalBlockedDates(new Set());
          setAvailabilityOverrides({});
          setPendingSelectionStartKey(null);
          setSelectedDateKeys([]);
          setSidebarMode("summary");
          setDetailsError("");
        }
        return;
      }

      const token = getAccessToken();
      if (!token) {
        if (mounted) {
          setPropertyDetails(null);
          setExternalBlockedDates(new Set());
          setAvailabilityOverrides({});
          setPendingSelectionStartKey(null);
          setSelectedDateKeys([]);
          setSidebarMode("summary");
          setDetailsError("Could not load property details. Please sign in again.");
        }
        return;
      }

      setIsLoadingDetails(true);
      setDetailsError("");

      try {
        const [detailsResponse, icalData] = await Promise.all([
          fetch(`${PROPERTY_API_BASE}/hostDashboard/single?property=${encodeURIComponent(selectedPropertyId)}`, {
            method: "GET",
            headers: {
              Authorization: token,
            },
          }),
          dbListIcalSources(selectedPropertyId).catch(() => ({ blockedDates: [] })),
        ]);

        if (!detailsResponse.ok) {
          throw new Error(`Could not load listing details (${detailsResponse.status}).`);
        }

        const details = await detailsResponse.json();
        const blockedDates = Array.isArray(icalData?.blockedDates) ? icalData.blockedDates : [];

        if (!mounted) {
          return;
        }

        setPropertyDetails(details || null);
        setExternalBlockedDates(new Set(blockedDates));
        setAvailabilityOverrides({});
        setSelectionPriceInput("");
        setSelectionPriceDirty(false);
        setPendingSelectionStartKey(null);
        setSelectedDateKeys([]);
        setSidebarMode("summary");
      } catch (error) {
        if (!mounted) {
          return;
        }
        setPropertyDetails(null);
        setExternalBlockedDates(new Set());
        setAvailabilityOverrides({});
        setSelectionPriceInput("");
        setSelectionPriceDirty(false);
        setPendingSelectionStartKey(null);
        setSelectedDateKeys([]);
        setSidebarMode("summary");
        setDetailsError(error?.message || "Could not load listing details.");
      } finally {
        if (mounted) {
          setIsLoadingDetails(false);
        }
      }
    };

    loadPropertyDetails();

    return () => {
      mounted = false;
    };
  }, [selectedPropertyId]);

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
  }, [propertyDetails, pricingSnapshot.weekendRate]);

  const handleDateSelect = (dateContext) => {
    const key = String(dateContext?.key || "");
    if (!key) {
      return;
    }
    if (!currentMonthKeys.has(key)) {
      return;
    }

    setSidebarMode("summary");

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
    if (!canSaveSelectionPrice) {
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
      setPricingSettingsSavedSnapshot(normalizedForm);
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

  const activeErrorMessage = listingsError || detailsError;
  const isCalendarLoading = isLoadingListings || isLoadingDetails;
  const calendarLoadingMessage = isLoadingListings
    ? "Loading accommodations..."
    : "Fetching accommodation info...";
  const isSidebarLoading = isLoadingListings || (Boolean(selectedPropertyId) && isLoadingDetails);
  const sidebarLoadingMessage = isLoadingListings
    ? "Loading accommodations..."
    : "Fetching accommodation info...";

  return (
    <section className="hc-page">
      <h1 className="hc-title">Calendar & Pricing</h1>

      {activeErrorMessage && <p className="hc-alert hc-alert--error">{activeErrorMessage}</p>}
      {!isLoadingListings && listingOptions.length === 0 && !activeErrorMessage && (
        <p className="hc-empty-state">No listings were found for this host account.</p>
      )}

      <div className="hc-layout">
        <div className="hc-main">
          <Toolbar
            view={view}
            onViewChange={setView}
            onToday={today}
            listingOptions={listingOptions}
            selectedPropertyId={selectedPropertyId}
            onSelectProperty={setSelectedPropertyId}
            isLoadingListings={isLoadingListings}
          />

          <CalendarGrid
            view={view}
            cursor={cursor}
            monthGrid={monthGrid}
            onPrev={prev}
            onNext={next}
            availabilityRanges={availabilityRanges}
            externalBlockedDates={externalBlockedDates}
            nightlyRate={pricingSnapshot.nightlyRate}
            weekendRate={pricingSnapshot.weekendRate}
            isLoading={isCalendarLoading}
            loadingMessage={calendarLoadingMessage}
            selectedDateKeys={selectedDateKeys}
            pendingSelectionStartKey={pendingSelectionStartKey}
            availabilityOverrides={availabilityOverrides}
            priceOverrides={selectedPropertyPriceOverrides}
            bookedDateKeys={bookedDateKeys}
            onDateSelect={handleDateSelect}
          />
        </div>

        <aside className="hc-sidebar">
          {isSidebarLoading ? (
            <section className="hc-sidebar-loading-card" aria-label="Loading pricing and availability">
              <PulseBarsLoader message={sidebarLoadingMessage} />
            </section>
          ) : selectedDateKeys.length > 0 ? (
            <SelectionCard
              selectedCount={selectedAvailabilityStats.total}
              allSelectedAvailable={selectedAvailabilityStats.allAvailable}
              onToggleAvailability={handleToggleAvailability}
              priceInputValue={selectionPriceInput}
              onPriceInputChange={handleSelectionPriceChange}
              showSavePrice={selectionPriceDirty}
              canSavePrice={canSaveSelectionPrice}
              onSavePrice={handleSaveSelectionPrice}
            />
          ) : sidebarMode === "pricing-settings" ? (
            <PricingSettingsCard
              nightlyRate={normalizedPricingSettingsForm.nightlyRate}
              weekendRate={pricingSnapshot.weekendRate}
              weeklyDiscountPercent={normalizedPricingSettingsForm.weeklyDiscountEnabled
                ? normalizedPricingSettingsForm.weeklyDiscountPercent
                : 0}
              monthlyDiscountPercent={normalizedPricingSettingsForm.monthlyDiscountEnabled
                ? normalizedPricingSettingsForm.monthlyDiscountPercent
                : 0}
              nightlyRateInput={pricingSettingsForm.nightlyRate}
              weekendRateInput={weekendRateInput}
              weeklyDiscountEnabled={pricingSettingsForm.weeklyDiscountEnabled}
              weeklyDiscountPercentInput={pricingSettingsForm.weeklyDiscountPercent}
              monthlyDiscountEnabled={pricingSettingsForm.monthlyDiscountEnabled}
              monthlyDiscountPercentInput={pricingSettingsForm.monthlyDiscountPercent}
              onNightlyRateChange={(value) => {
                const nextValue = String(value).trim();
                updatePricingSettingsForm({
                  nightlyRate: nextValue,
                });
              }}
              onWeekendRateChange={(value) => {
                const nextValue = String(value).trim();
                setWeekendRateInput(nextValue);
              }}
              onWeeklyDiscountToggle={(enabled) =>
                updatePricingSettingsForm({
                  weeklyDiscountEnabled: enabled,
                  weeklyDiscountPercent:
                    enabled && Number(pricingSettingsForm.weeklyDiscountPercent) <= 0
                      ? createInitialPricingForm().weeklyDiscountPercent
                      : pricingSettingsForm.weeklyDiscountPercent,
                })
              }
              onWeeklyDiscountPercentChange={(value) =>
                updatePricingSettingsForm({ weeklyDiscountPercent: Number(value) || 0 })
              }
              onMonthlyDiscountToggle={(enabled) =>
                updatePricingSettingsForm({
                  monthlyDiscountEnabled: enabled,
                  monthlyDiscountPercent:
                    enabled && Number(pricingSettingsForm.monthlyDiscountPercent) <= 0
                      ? createInitialPricingForm().monthlyDiscountPercent
                      : pricingSettingsForm.monthlyDiscountPercent,
                })
              }
              onMonthlyDiscountPercentChange={(value) =>
                updatePricingSettingsForm({ monthlyDiscountPercent: Number(value) || 0 })
              }
              showSaveButton={hasAnyPricingSettingsChanges}
              canSave={canSavePricingSettings}
              saving={isSavingPricingSettings}
              saveError={pricingSettingsSaveError}
              onSave={handleSavePricingSettings}
              onBack={() => setSidebarMode("summary")}
            />
          ) : (
            <>
              <PricingCard
                nightlyRate={pricingSnapshot.nightlyRate}
                weekendRate={pricingSnapshot.weekendRate}
                weeklyDiscountPercent={pricingSnapshot.weeklyDiscountPercent}
                onOpenSettings={() => setSidebarMode("pricing-settings")}
              />
              <AvailabilityCard
                minimumStay={pricingSnapshot.minimumStay}
                maximumStay={pricingSnapshot.maximumStay}
                advanceNoticeDays={pricingSnapshot.advanceNoticeDays}
              />
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
