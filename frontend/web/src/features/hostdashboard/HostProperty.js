import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useLocation, useNavigate } from "react-router-dom";
import { getAccessToken } from "../../services/getAccessToken";
import { toast } from "react-toastify";
import ClipLoader from "react-spinners/ClipLoader";
import styles from "./HostProperty.module.css";
import amenitiesCatalogue from "../../store/amenities";
import arrowDownIcon from "../../images/arrow-down-icon.svg";
import arrowUpIcon from "../../images/arrow-up-icon.svg";
import infoIcon from "../../images/icons/info.png";
import checkIcon from "../../images/icons/checkPng.png";
import crossIcon from "../../images/icons/cross.png";
import { normalizeImageUrl } from "../guestdashboard/utils/image";

const PROPERTY_API_BASE = "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property";
const TABS = ["Overview", "Photos", "Amenities", "Pricing", "Availability", "Policies"];
const SPACE_TYPE_OPTIONS = ["Entire house", "Private room", "Shared room"];
const MAX_CAPACITY_VALUE = 99;
const AMENITY_CATEGORY_ORDER = [
  "Essentials",
  "Kitchen",
  "Bathroom",
  "Safety",
  "Outdoor",
  "Technology",
  "Bedroom",
  "LivingArea",
  "Laundry",
  "FamilyFriendly",
  "Convenience",
  "Accessibility",
  "ExtraServices",
  "EcoFriendly",
];
const POLICY_RULE_CONFIG = [
  { rule: "SmokingAllowed", label: "No smoking", invert: true },
  { rule: "PetsAllowed", label: "No pets", invert: true },
  { rule: "Parties/EventsAllowed", label: "No parties or events", invert: true },
  { rule: "SuitableForChildren", label: "Suitable for children", invert: false },
  { rule: "SuitableForInfants", label: "Suitable for infants", invert: false },
];
const PRICING_RESTRICTION_KEYS = {
  minimumStay: "MinimumStay",
  maximumStay: "MaximumStay",
  weeklyDiscountPercent: "WeeklyDiscountPercent",
  monthlyDiscountPercent: "MonthlyDiscountPercent",
  lastMinuteDiscountDays: "LastMinuteDiscountDaysBeforeCheckIn",
  lastMinuteDiscountPercent: "LastMinuteDiscountPercent",
  earlyBirdDiscountDays: "EarlyBirdDiscountDaysBeforeCheckIn",
  earlyBirdDiscountPercent: "EarlyBirdDiscountPercent",
};
const PRICING_MIN_NIGHTLY_RATE = 2;
const PRICING_MAX_NIGHTLY_RATE = 100000;
const PRICING_STAY_OPTIONS = Array.from({ length: 60 }, (_, index) => index + 1);
const PRICING_MAX_STAY_OPTIONS = [0, ...PRICING_STAY_OPTIONS];
const PRICING_DISCOUNT_PERCENT_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const PRICING_LAST_MINUTE_DAY_OPTIONS = [1, 2, 3, 5, 7, 10, 14];
const PRICING_EARLY_BIRD_DAY_OPTIONS = [7, 14, 21, 30, 45, 60, 90];
const PHOTO_CATEGORY_PLACEHOLDERS = ["Master Bedroom", "Living room", "Bedroom 2", "Bathroom"];
const MAX_PROPERTY_IMAGES = 30;
const MIN_PHOTO_WIDTH = 1024;
const MIN_PHOTO_HEIGHT = 683;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_PENDING_PHOTO_BYTES = 5 * 1024 * 1024 * 30;
const PHOTO_REORDER_LONG_PRESS_MS = 50;
const PHOTO_REORDER_MOVE_CANCEL_PX = 12;
const PHOTO_ACCEPT = ".jpg,.jpeg,.png,.webp";
const PHOTO_ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PHOTO_REORDER_KEY_DELTAS = {
  ArrowLeft: -1,
  ArrowUp: -1,
  ArrowRight: 1,
  ArrowDown: 1,
};

const createInitialPolicyRules = () =>
  POLICY_RULE_CONFIG.reduce((accumulator, ruleConfig) => {
    accumulator[ruleConfig.rule] = false;
    return accumulator;
  }, {});

const createInitialPricingForm = () => ({
  nightlyRate: 120,
  minimumStay: 1,
  maximumStay: 0,
  weeklyDiscountEnabled: false,
  weeklyDiscountPercent: 10,
  monthlyDiscountEnabled: false,
  monthlyDiscountPercent: 10,
  lastMinuteDiscountEnabled: false,
  lastMinuteDiscountDays: 5,
  lastMinuteDiscountPercent: 10,
  earlyBirdDiscountEnabled: false,
  earlyBirdDiscountDays: 30,
  earlyBirdDiscountPercent: 10,
});

const SAVE_ENABLED_TABS = new Set(["Overview", "Photos", "Amenities", "Pricing", "Policies"]);
const SAVING_MESSAGE_BY_TAB = {
  Photos: "Uploading photos...",
  Amenities: "Saving amenities...",
  Pricing: "Saving pricing...",
  Policies: "Saving policies...",
};
const SAVE_SUCCESS_MESSAGE_BY_TAB = {
  Amenities: "Amenities updated successfully.",
  Pricing: "Pricing updated successfully.",
  Policies: "Policies updated successfully.",
};

const clampInteger = (value, fallback, min, max) => {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }
  const clampedValue = Math.trunc(parsedValue);
  if (clampedValue < min) {
    return min;
  }
  if (clampedValue > max) {
    return max;
  }
  return clampedValue;
};

const normalizeDiscountPercent = (value, fallback) => clampInteger(value, fallback, 0, 100);

const normalizePricingForm = (pricingForm) => {
  const defaultPricingForm = createInitialPricingForm();
  const nightlyRate = clampInteger(
    pricingForm?.nightlyRate,
    defaultPricingForm.nightlyRate,
    PRICING_MIN_NIGHTLY_RATE,
    PRICING_MAX_NIGHTLY_RATE
  );
  const minimumStay = clampInteger(pricingForm?.minimumStay, defaultPricingForm.minimumStay, 1, 365);
  const maximumStayRaw = clampInteger(pricingForm?.maximumStay, defaultPricingForm.maximumStay, 0, 365);
  const maximumStay = maximumStayRaw === 0 ? 0 : Math.max(minimumStay, maximumStayRaw);
  const weeklyDiscountEnabled = Boolean(pricingForm?.weeklyDiscountEnabled);
  const monthlyDiscountEnabled = Boolean(pricingForm?.monthlyDiscountEnabled);
  const lastMinuteDiscountEnabled = Boolean(pricingForm?.lastMinuteDiscountEnabled);
  const earlyBirdDiscountEnabled = Boolean(pricingForm?.earlyBirdDiscountEnabled);

  return {
    nightlyRate,
    minimumStay,
    maximumStay,
    weeklyDiscountEnabled,
    weeklyDiscountPercent: normalizeDiscountPercent(
      pricingForm?.weeklyDiscountPercent,
      defaultPricingForm.weeklyDiscountPercent
    ),
    monthlyDiscountEnabled,
    monthlyDiscountPercent: normalizeDiscountPercent(
      pricingForm?.monthlyDiscountPercent,
      defaultPricingForm.monthlyDiscountPercent
    ),
    lastMinuteDiscountEnabled,
    lastMinuteDiscountDays: clampInteger(
      pricingForm?.lastMinuteDiscountDays,
      defaultPricingForm.lastMinuteDiscountDays,
      1,
      365
    ),
    lastMinuteDiscountPercent: normalizeDiscountPercent(
      pricingForm?.lastMinuteDiscountPercent,
      defaultPricingForm.lastMinuteDiscountPercent
    ),
    earlyBirdDiscountEnabled,
    earlyBirdDiscountDays: clampInteger(
      pricingForm?.earlyBirdDiscountDays,
      defaultPricingForm.earlyBirdDiscountDays,
      1,
      365
    ),
    earlyBirdDiscountPercent: normalizeDiscountPercent(
      pricingForm?.earlyBirdDiscountPercent,
      defaultPricingForm.earlyBirdDiscountPercent
    ),
  };
};

const buildPricingSnapshot = (pricingForm) => normalizePricingForm(pricingForm);

const buildPricingRestrictionsPayload = (pricingForm) => {
  const normalizedPricingForm = normalizePricingForm(pricingForm);
  return [
    {
      restriction: PRICING_RESTRICTION_KEYS.minimumStay,
      value: normalizedPricingForm.minimumStay,
    },
    {
      restriction: PRICING_RESTRICTION_KEYS.maximumStay,
      value: normalizedPricingForm.maximumStay,
    },
    {
      restriction: PRICING_RESTRICTION_KEYS.weeklyDiscountPercent,
      value: normalizedPricingForm.weeklyDiscountEnabled ? normalizedPricingForm.weeklyDiscountPercent : 0,
    },
    {
      restriction: PRICING_RESTRICTION_KEYS.monthlyDiscountPercent,
      value: normalizedPricingForm.monthlyDiscountEnabled ? normalizedPricingForm.monthlyDiscountPercent : 0,
    },
    {
      restriction: PRICING_RESTRICTION_KEYS.lastMinuteDiscountDays,
      value: normalizedPricingForm.lastMinuteDiscountEnabled ? normalizedPricingForm.lastMinuteDiscountDays : 0,
    },
    {
      restriction: PRICING_RESTRICTION_KEYS.lastMinuteDiscountPercent,
      value: normalizedPricingForm.lastMinuteDiscountEnabled ? normalizedPricingForm.lastMinuteDiscountPercent : 0,
    },
    {
      restriction: PRICING_RESTRICTION_KEYS.earlyBirdDiscountDays,
      value: normalizedPricingForm.earlyBirdDiscountEnabled ? normalizedPricingForm.earlyBirdDiscountDays : 0,
    },
    {
      restriction: PRICING_RESTRICTION_KEYS.earlyBirdDiscountPercent,
      value: normalizedPricingForm.earlyBirdDiscountEnabled ? normalizedPricingForm.earlyBirdDiscountPercent : 0,
    },
  ];
};

const buildAvailabilityRestrictionValueMap = (availabilityRestrictions) =>
  new Map(
    (Array.isArray(availabilityRestrictions) ? availabilityRestrictions : [])
      .map((entry) => {
        const restriction = String(entry?.restriction || "").trim();
        if (!restriction) {
          return null;
        }
        const value = Number(entry?.value);
        return [restriction, Number.isFinite(value) ? Math.trunc(value) : 0];
      })
      .filter(Boolean)
  );

const readRestrictionValue = (restrictionValueMap, restrictionKey, fallbackValue = 0) => {
  if (!restrictionValueMap.has(restrictionKey)) {
    return fallbackValue;
  }
  const value = Number(restrictionValueMap.get(restrictionKey));
  return Number.isFinite(value) ? Math.trunc(value) : fallbackValue;
};

const mapPropertyPricingToState = (pricing, availabilityRestrictions) => {
  const restrictionValueMap = buildAvailabilityRestrictionValueMap(availabilityRestrictions);
  const defaultPricingForm = createInitialPricingForm();
  const nightlyRateRaw = Number(pricing?.roomRate ?? pricing?.roomrate);
  const nightlyRate = Number.isFinite(nightlyRateRaw)
    ? clampInteger(nightlyRateRaw, defaultPricingForm.nightlyRate, PRICING_MIN_NIGHTLY_RATE, PRICING_MAX_NIGHTLY_RATE)
    : defaultPricingForm.nightlyRate;
  const minimumStay = clampInteger(
    readRestrictionValue(restrictionValueMap, PRICING_RESTRICTION_KEYS.minimumStay, defaultPricingForm.minimumStay),
    defaultPricingForm.minimumStay,
    1,
    365
  );
  const maximumStayRaw = clampInteger(
    readRestrictionValue(restrictionValueMap, PRICING_RESTRICTION_KEYS.maximumStay, defaultPricingForm.maximumStay),
    defaultPricingForm.maximumStay,
    0,
    365
  );
  const maximumStay = maximumStayRaw === 0 ? 0 : Math.max(minimumStay, maximumStayRaw);
  const weeklyDiscountPercent = normalizeDiscountPercent(
    readRestrictionValue(
      restrictionValueMap,
      PRICING_RESTRICTION_KEYS.weeklyDiscountPercent,
      0
    ),
    0
  );
  const monthlyDiscountPercent = normalizeDiscountPercent(
    readRestrictionValue(
      restrictionValueMap,
      PRICING_RESTRICTION_KEYS.monthlyDiscountPercent,
      0
    ),
    0
  );
  const lastMinuteDiscountDays = clampInteger(
    readRestrictionValue(
      restrictionValueMap,
      PRICING_RESTRICTION_KEYS.lastMinuteDiscountDays,
      defaultPricingForm.lastMinuteDiscountDays
    ),
    defaultPricingForm.lastMinuteDiscountDays,
    1,
    365
  );
  const lastMinuteDiscountPercent = normalizeDiscountPercent(
    readRestrictionValue(
      restrictionValueMap,
      PRICING_RESTRICTION_KEYS.lastMinuteDiscountPercent,
      0
    ),
    0
  );
  const earlyBirdDiscountDays = clampInteger(
    readRestrictionValue(
      restrictionValueMap,
      PRICING_RESTRICTION_KEYS.earlyBirdDiscountDays,
      defaultPricingForm.earlyBirdDiscountDays
    ),
    defaultPricingForm.earlyBirdDiscountDays,
    1,
    365
  );
  const earlyBirdDiscountPercent = normalizeDiscountPercent(
    readRestrictionValue(
      restrictionValueMap,
      PRICING_RESTRICTION_KEYS.earlyBirdDiscountPercent,
      0
    ),
    0
  );

  return {
    nightlyRate,
    minimumStay,
    maximumStay,
    weeklyDiscountEnabled: weeklyDiscountPercent > 0,
    weeklyDiscountPercent,
    monthlyDiscountEnabled: monthlyDiscountPercent > 0,
    monthlyDiscountPercent,
    lastMinuteDiscountEnabled: lastMinuteDiscountPercent > 0 && lastMinuteDiscountDays > 0,
    lastMinuteDiscountDays,
    lastMinuteDiscountPercent,
    earlyBirdDiscountEnabled: earlyBirdDiscountPercent > 0 && earlyBirdDiscountDays > 0,
    earlyBirdDiscountDays,
    earlyBirdDiscountPercent,
  };
};

const getSelectOptionsWithCurrent = (options, currentValue) => {
  const normalizedCurrentValue = Number(currentValue);
  if (!Number.isFinite(normalizedCurrentValue)) {
    return [...options];
  }
  if (options.includes(normalizedCurrentValue)) {
    return [...options];
  }
  return [...options, normalizedCurrentValue].sort((left, right) => left - right);
};

const getStayOptionLabel = (value) => {
  if (value === 0) {
    return "No maximum";
  }
  return `${value} night${value === 1 ? "" : "s"}`;
};

const normalizeCapacityValue = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(MAX_CAPACITY_VALUE, Math.trunc(numeric)));
};

const parseHouseNumber = (houseNumberInput) => {
  const value = String(houseNumberInput || "").trim();
  if (!value) {
    return null;
  }

  let digitEndIndex = 0;
  while (digitEndIndex < value.length && value[digitEndIndex] >= "0" && value[digitEndIndex] <= "9") {
    digitEndIndex += 1;
  }

  if (digitEndIndex === 0) {
    return null;
  }

  const parsedHouseNumber = Number(value.slice(0, digitEndIndex));
  if (!Number.isFinite(parsedHouseNumber)) {
    return null;
  }

  return {
    houseNumber: Math.trunc(parsedHouseNumber),
    houseNumberExtension: value.slice(digitEndIndex).trim(),
  };
};

const getLocationPayload = (address) => {
  const street = address.street.trim();
  const houseNumber = address.houseNumber.trim();
  const postalCode = address.postalCode.trim();
  const city = address.city.trim();
  const country = address.country.trim();

  if (!street || !houseNumber || !postalCode || !city || !country) {
    return undefined;
  }

  const parsedHouseNumber = parseHouseNumber(houseNumber);
  if (!parsedHouseNumber) {
    return undefined;
  }

  return {
    street,
    houseNumber: parsedHouseNumber.houseNumber,
    houseNumberExtension: parsedHouseNumber.houseNumberExtension,
    postalCode,
    city,
    country,
  };
};

const getApiErrorMessage = async (response, fallbackMessage) => {
  try {
    const rawBody = await response.text();
    if (!rawBody) {
      return fallbackMessage;
    }

    try {
      const parsedBody = JSON.parse(rawBody);
      if (typeof parsedBody === "string" && parsedBody.trim()) {
        return parsedBody.trim();
      }
      if (typeof parsedBody?.message === "string" && parsedBody.message.trim()) {
        return parsedBody.message.trim();
      }
    } catch {
      if (rawBody.trim()) {
        return rawBody.trim();
      }
    }

    return fallbackMessage;
  } catch {
    return fallbackMessage;
  }
};

const findDetailValue = (generalDetails, key) => {
  const detail = generalDetails.find((item) => item?.detail === key);
  if (!detail) {
    return 0;
  }
  const value = Number(detail.value);
  return Number.isFinite(value) ? value : 0;
};

const mapHostProperties = (hostPropertiesData, property) => {
  const mappedHostProperties = (Array.isArray(hostPropertiesData) ? hostPropertiesData : [])
    .map((accommodation) => ({
      id: accommodation?.property?.id || "",
      title: accommodation?.property?.title || "Untitled listing",
      status: accommodation?.property?.status || "INACTIVE",
    }))
    .filter((accommodation) => Boolean(accommodation.id));

  if (property?.id && !mappedHostProperties.some((accommodation) => accommodation.id === property.id)) {
    mappedHostProperties.unshift({
      id: property.id,
      title: property.title || "Untitled listing",
      status: property.status || "INACTIVE",
    });
  }

  return mappedHostProperties;
};

const buildHouseNumber = (locationData) => {
  const houseNumberRaw = locationData.houseNumber ?? locationData.housenumber ?? "";
  const houseNumberExtension = locationData.houseNumberExtension ?? locationData.housenumberextension ?? "";
  if (houseNumberRaw === "") {
    return "";
  }
  const extensionSuffix = houseNumberExtension ? ` ${houseNumberExtension}` : "";
  return `${houseNumberRaw}${extensionSuffix}`;
};

const mapPropertyRulesToState = (propertyRules) => {
  const nextRules = createInitialPolicyRules();
  propertyRules.forEach((rule) => {
    const ruleName = String(rule?.rule || "");
    if (!Object.hasOwn(nextRules, ruleName)) {
      return;
    }
    nextRules[ruleName] = Boolean(rule?.value);
  });
  return nextRules;
};

const mapPropertyImagesToState = (images) => {
  const safeImages = Array.isArray(images) ? images : [];
  return safeImages
    .map((image, index) => {
      const webKey = String(image?.web_key || "").trim();
      const thumbKey = String(image?.thumb_key || "").trim();
      const originalKey = String(image?.original_key || "").trim();
      const fallbackKey = String(image?.key || "").trim();
      const anyKey = webKey || thumbKey || originalKey || fallbackKey;
      if (!anyKey) {
        return null;
      }
      const rawSortOrder = Number(image?.sort_order);
      const sortOrder = Number.isFinite(rawSortOrder) ? rawSortOrder : index;
      const imageId = String(image?.image_id || image?.id || anyKey || `legacy-${index}`);
      return {
        id: imageId,
        key: fallbackKey || webKey || thumbKey || originalKey,
        webKey: webKey || null,
        thumbKey: thumbKey || null,
        originalKey: originalKey || null,
        sortOrder,
        status: String(image?.status || "READY"),
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.sortOrder - right.sortOrder);
};

const buildDisplayedPhotos = (existingPhotos, pendingPhotos, photoOrderIds) => {
  const existingById = new Map((Array.isArray(existingPhotos) ? existingPhotos : []).map((photo) => [photo.id, photo]));
  const pendingById = new Map((Array.isArray(pendingPhotos) ? pendingPhotos : []).map((photo) => [photo.id, photo]));
  const orderedIds = Array.isArray(photoOrderIds) ? photoOrderIds : [];
  const missingIds = [
    ...existingById.keys(),
    ...pendingById.keys(),
  ].filter((photoId) => !orderedIds.includes(photoId));
  const resolvedOrder = [...orderedIds, ...missingIds];

  return resolvedOrder
    .map((photoId, index) => {
      const existingPhoto = existingById.get(photoId);
      if (existingPhoto) {
        const preferredKey = index === 0
          ? existingPhoto.webKey || existingPhoto.key || existingPhoto.thumbKey || existingPhoto.originalKey
          : existingPhoto.thumbKey || existingPhoto.webKey || existingPhoto.key || existingPhoto.originalKey;
        return {
          id: photoId,
          src: normalizeImageUrl(preferredKey),
          isPending: false,
        };
      }

      const pendingPhoto = pendingById.get(photoId);
      if (pendingPhoto) {
        return {
          id: photoId,
          src: pendingPhoto.previewUrl,
          isPending: true,
        };
      }
      return null;
    })
    .filter(Boolean);
};

const normalizeAmenityIds = (amenityIds) =>
  Array.from(
    new Set(
      (Array.isArray(amenityIds) ? amenityIds : [])
        .map((amenityId) => String(amenityId).trim())
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right));

const buildPolicyRulesSnapshot = (policyRules) =>
  POLICY_RULE_CONFIG.reduce((snapshot, ruleConfig) => {
    snapshot[ruleConfig.rule] = Boolean(policyRules?.[ruleConfig.rule]);
    return snapshot;
  }, {});

const buildOverviewSnapshot = (form, capacity, address) => ({
  form: {
    title: String(form?.title || ""),
    subtitle: String(form?.subtitle || ""),
    description: String(form?.description || ""),
  },
  capacity: {
    propertyType: String(capacity?.propertyType || ""),
    guests: normalizeCapacityValue(capacity?.guests),
    bedrooms: normalizeCapacityValue(capacity?.bedrooms),
    beds: normalizeCapacityValue(capacity?.beds),
    bathrooms: normalizeCapacityValue(capacity?.bathrooms),
  },
  address: {
    street: String(address?.street || ""),
    houseNumber: String(address?.houseNumber || ""),
    postalCode: String(address?.postalCode || ""),
    city: String(address?.city || ""),
    country: String(address?.country || ""),
  },
});

const areStringArraysEqual = (left, right) => {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
};

const areSnapshotsEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);
let pendingPhotoIdFallbackCounter = 0;

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(String(reader.result || ""));
    };
    reader.onerror = () => {
      reject(new Error("Could not read photo file."));
    };
    reader.readAsDataURL(file);
  });

const readImageDimensions = (source) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.width, height: image.height });
    };
    image.onerror = () => {
      reject(new Error("Invalid image file."));
    };
    image.src = source;
  });

const createPendingPhotoId = () => {
  if (typeof globalThis !== "undefined") {
    const cryptoApi = globalThis.crypto;
    if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
      return `pending-${cryptoApi.randomUUID()}`;
    }
  }
  pendingPhotoIdFallbackCounter += 1;
  return `pending-${Date.now()}-${pendingPhotoIdFallbackCounter}`;
};

const createPendingPhotoFromFile = async (file) => {
  if (!PHOTO_ALLOWED_TYPES.has(file.type)) {
    throw new Error("Only JPG, PNG and WEBP are allowed.");
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error("Each photo can be up to 5 MB.");
  }

  const previewUrl = await readFileAsDataUrl(file);
  const dimensions = await readImageDimensions(previewUrl);
  if (dimensions.width < MIN_PHOTO_WIDTH || dimensions.height < MIN_PHOTO_HEIGHT) {
    throw new Error(`Photo must be at least ${MIN_PHOTO_WIDTH}x${MIN_PHOTO_HEIGHT}px.`);
  }

  return {
    id: createPendingPhotoId(),
    previewUrl,
    file,
    contentType: file.type,
    size: file.size,
  };
};

const extractFetchedPropertyData = (data, hostPropertiesData) => {
  const propertyAmenities = Array.isArray(data?.amenities) ? data.amenities : [];
  const propertyRules = Array.isArray(data?.rules) ? data.rules : [];
  const propertyImages = Array.isArray(data?.images) ? data.images : [];
  const availabilityRestrictions = Array.isArray(data?.availabilityRestrictions)
    ? data.availabilityRestrictions
    : [];
  const property = data?.property || {};
  const generalDetails = Array.isArray(data?.generalDetails) ? data.generalDetails : [];
  const locationData = data?.location || {};
  const propertyType = data?.propertyType || {};
  const propertyPricing = data?.pricing || null;

  return {
    status: property.status || "INACTIVE",
    form: {
      title: property.title || "",
      subtitle: property.subtitle || "",
      description: property.description || "",
    },
    capacity: {
      propertyType: propertyType.spaceType || "",
      guests: findDetailValue(generalDetails, "Guests"),
      bedrooms: findDetailValue(generalDetails, "Bedrooms"),
      beds: findDetailValue(generalDetails, "Beds"),
      bathrooms: findDetailValue(generalDetails, "Bathrooms"),
    },
    address: {
      street: locationData.street || "",
      houseNumber: buildHouseNumber(locationData),
      postalCode: locationData.postalCode || locationData.postalcode || "",
      city: locationData.city || "",
      country: locationData.country || "",
    },
    selectedAmenityIds: propertyAmenities.map((amenity) => String(amenity?.amenityId || "")).filter(Boolean),
    policyRules: mapPropertyRulesToState(propertyRules),
    pricingForm: mapPropertyPricingToState(propertyPricing, availabilityRestrictions),
    existingPhotos: mapPropertyImagesToState(propertyImages),
    hostProperties: mapHostProperties(hostPropertiesData, property),
  };
};

const fetchPropertyAndListings = async (propertyId) => {
  const [response, hostPropertiesResponse] = await Promise.all([
    fetch(`${PROPERTY_API_BASE}/hostDashboard/single?property=${encodeURIComponent(propertyId)}`, {
      method: "GET",
      headers: {
        Authorization: getAccessToken(),
      },
    }),
    fetch(`${PROPERTY_API_BASE}/hostDashboard/all`, {
      method: "GET",
      headers: {
        Authorization: getAccessToken(),
      },
    }),
  ]);

  if (!response.ok) {
    throw new Error("Failed to fetch property.");
  }

  const data = await response.json();
  const hostPropertiesData = hostPropertiesResponse.ok ? await hostPropertiesResponse.json() : [];
  return { data, hostPropertiesData };
};

const fetchPropertySnapshot = async (propertyId) => {
  const response = await fetch(`${PROPERTY_API_BASE}/hostDashboard/single?property=${encodeURIComponent(propertyId)}`, {
    method: "GET",
    headers: {
      Authorization: getAccessToken(),
    },
  });

  if (!response.ok) {
    throw new Error("Could not verify saved data. Please try again.");
  }

  return response.json();
};

const verifyAmenities = async (propertyId, amenitiesPayload) => {
  const verificationData = await fetchPropertySnapshot(propertyId);
  const persistedAmenityIds = new Set(
    (Array.isArray(verificationData?.amenities) ? verificationData.amenities : [])
      .map((amenity) => String(amenity?.amenityId || ""))
      .filter(Boolean)
  );
  const expectedAmenityIds = new Set((amenitiesPayload || []).map(String));
  const hasSameAmenities =
    persistedAmenityIds.size === expectedAmenityIds.size &&
    [...expectedAmenityIds].every((amenityId) => persistedAmenityIds.has(amenityId));

  if (!hasSameAmenities) {
    throw new Error("Amenities could not be updated in the deployed backend yet.");
  }
};

const verifyPolicies = async (propertyId, rulesPayload) => {
  const verificationData = await fetchPropertySnapshot(propertyId);
  const persistedRulesMap = new Map(
    (Array.isArray(verificationData?.rules) ? verificationData.rules : [])
      .map((rule) => [String(rule?.rule || ""), Boolean(rule?.value)])
      .filter(([ruleName]) => Boolean(ruleName))
  );

  const hasSamePolicies = (rulesPayload || []).every(
    (rule) => persistedRulesMap.get(rule.rule) === Boolean(rule.value)
  );

  if (!hasSamePolicies) {
    throw new Error("Policies could not be updated in the deployed backend yet.");
  }
};

const verifyPricing = async (propertyId, pricingPayload, availabilityRestrictionsPayload) => {
  const verificationData = await fetchPropertySnapshot(propertyId);
  const persistedRoomRate = Number(verificationData?.pricing?.roomRate ?? verificationData?.pricing?.roomrate);
  const expectedRoomRate = Number(pricingPayload?.roomRate);
  const hasSameRoomRate = Number.isFinite(persistedRoomRate) && Number.isFinite(expectedRoomRate)
    ? Math.trunc(persistedRoomRate) === Math.trunc(expectedRoomRate)
    : false;
  if (!hasSameRoomRate) {
    throw new Error("Pricing could not be updated in the deployed backend yet.");
  }

  const persistedRestrictionValueMap = buildAvailabilityRestrictionValueMap(verificationData?.availabilityRestrictions);
  const hasSameRestrictions = (availabilityRestrictionsPayload || []).every((restriction) => {
    const persistedValue = Number(persistedRestrictionValueMap.get(restriction.restriction));
    const expectedValue = Number(restriction.value);
    if (!Number.isFinite(expectedValue)) {
      return false;
    }
    return Number.isFinite(persistedValue) && Math.trunc(persistedValue) === Math.trunc(expectedValue);
  });
  if (!hasSameRestrictions) {
    throw new Error("Pricing restrictions could not be updated in the deployed backend yet.");
  }
};

const getSaveSuccessMessage = (selectedTab) => SAVE_SUCCESS_MESSAGE_BY_TAB[selectedTab] || "Property updated successfully.";

const resolveSaveErrorMessage = (error, isDevelopment) => {
  if (error?.name === "TypeError") {
    if (isDevelopment) {
      return "Could not reach the API. Check AWS deployment/CORS configuration and try again.";
    }
    return "Something went wrong while saving. Please try again later.";
  }
  return error?.message || "Saving failed. Please try again.";
};

const resolveDeletePhotoErrorMessage = (error, isDevelopment) => {
  if (error?.name === "TypeError") {
    if (isDevelopment) {
      return "Could not reach the API. Check AWS deployment/CORS configuration and try again.";
    }
    return "Something went wrong while deleting the photo. Please try again later.";
  }

  const errorMessage = String(error?.message || "");
  const isNotDeployedDeleteEndpoint =
    errorMessage.includes("Path not found.") ||
    errorMessage.includes("Method not found.") ||
    errorMessage.includes("Property not found.") ||
    errorMessage.includes("Missing propertyId.") ||
    errorMessage.includes("Photo deletion could not be confirmed");

  if (isNotDeployedDeleteEndpoint) {
    if (isDevelopment) {
      return "Photo delete endpoint is not deployed yet for this environment.";
    }
    return "Photo deletion is not available right now. Please try again later.";
  }

  if (!isDevelopment) {
    return "Something went wrong while deleting the photo. Please try again later.";
  }
  return errorMessage || "Photo deletion failed.";
};

const savePropertyChanges = async ({
  selectedTab,
  propertyId,
  form,
  capacity,
  address,
  selectedAmenityIds,
  policyRules,
  pricingForm,
}) => {
  const normalizedTitle = form.title.trim();
  const normalizedSubtitle = form.subtitle.trim();
  const normalizedDescription = form.description.trim();
  const isSavingAmenities = selectedTab === "Amenities";
  const isSavingPricing = selectedTab === "Pricing";
  const isSavingPolicies = selectedTab === "Policies";

  if (!normalizedTitle || !normalizedDescription) {
    throw new Error("Title and description cannot be empty.");
  }

  const normalizedPricingForm = normalizePricingForm(pricingForm);
  const pricingPayload = isSavingPricing
    ? { roomRate: normalizedPricingForm.nightlyRate }
    : undefined;
  const availabilityRestrictionsPayload = isSavingPricing
    ? buildPricingRestrictionsPayload(normalizedPricingForm)
    : undefined;
  const amenitiesPayload = isSavingAmenities ? selectedAmenityIds.map(String) : undefined;
  const rulesPayload = isSavingPolicies
    ? POLICY_RULE_CONFIG.map((ruleConfig) => ({
        rule: ruleConfig.rule,
        value: Boolean(policyRules[ruleConfig.rule]),
      }))
    : undefined;

  const response = await fetch(`${PROPERTY_API_BASE}/overview`, {
    method: "PATCH",
    headers: {
      Authorization: getAccessToken(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      propertyId,
      title: normalizedTitle,
      subtitle: normalizedSubtitle,
      description: normalizedDescription,
      capacity: {
        spaceType: capacity.propertyType || "Entire house",
        guests: normalizeCapacityValue(capacity.guests),
        bedrooms: normalizeCapacityValue(capacity.bedrooms),
        beds: normalizeCapacityValue(capacity.beds),
        bathrooms: normalizeCapacityValue(capacity.bathrooms),
      },
      location: getLocationPayload(address),
      amenities: amenitiesPayload,
      rules: rulesPayload,
      pricing: pricingPayload,
      availabilityRestrictions: availabilityRestrictionsPayload,
    }),
  });

  if (!response.ok) {
    const apiErrorMessage = await getApiErrorMessage(response, "Failed to save property overview.");
    throw new Error(apiErrorMessage);
  }

  if (isSavingAmenities) {
    await verifyAmenities(propertyId, amenitiesPayload);
  }

  if (isSavingPolicies) {
    await verifyPolicies(propertyId, rulesPayload);
  }

  if (isSavingPricing) {
    await verifyPricing(propertyId, pricingPayload, availabilityRestrictionsPayload);
  }

  return {
    normalizedForm: {
      title: normalizedTitle,
      subtitle: normalizedSubtitle,
      description: normalizedDescription,
    },
    normalizedPricingForm,
    successMessage: getSaveSuccessMessage(selectedTab),
  };
};

const normalizePhotoSaveInput = ({ existingPhotos, pendingPhotos, photoOrderIds }) => {
  const persistedPhotos = Array.isArray(existingPhotos) ? existingPhotos : [];
  const queuedPhotos = Array.isArray(pendingPhotos) ? pendingPhotos : [];
  const existingById = new Map(persistedPhotos.map((photo) => [photo.id, photo]));
  const pendingById = new Map(queuedPhotos.map((photo) => [photo.id, photo]));
  const rawOrderIds = Array.isArray(photoOrderIds) ? photoOrderIds : [];
  const normalizedOrderIds = [
    ...rawOrderIds.filter((photoId) => existingById.has(photoId) || pendingById.has(photoId)),
    ...[...existingById.keys(), ...pendingById.keys()].filter((photoId) => !rawOrderIds.includes(photoId)),
  ];

  return {
    persistedPhotos,
    queuedPhotos,
    existingById,
    normalizedOrderIds,
    orderedPendingPhotos: normalizedOrderIds
      .filter((photoId) => pendingById.has(photoId))
      .map((photoId) => pendingById.get(photoId)),
  };
};

const buildNoPhotoChangesResult = ({ existingPhotos, pendingPhotos, photoOrderIds }) => ({
  nextExistingPhotos: existingPhotos,
  nextPendingPhotos: pendingPhotos,
  nextPhotoOrderIds: photoOrderIds,
  successMessage: "No photo changes to save.",
  didUpload: false,
  didReorder: false,
});

const requestPhotoUploadSlots = async ({ propertyId, orderedPendingPhotos }) => {
  const presignResponse = await fetch(`${PROPERTY_API_BASE}/images/presign`, {
    method: "POST",
    headers: {
      Authorization: getAccessToken(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      propertyId,
      files: orderedPendingPhotos.map((photo) => ({
        contentType: photo.contentType,
        size: photo.size,
      })),
    }),
  });

  if (!presignResponse.ok) {
    const message = await getApiErrorMessage(presignResponse, "Failed to prepare photo upload.");
    throw new Error(message);
  }

  const presignData = await presignResponse.json();
  const uploads = Array.isArray(presignData?.uploads) ? presignData.uploads : [];
  if (uploads.length !== orderedPendingPhotos.length) {
    throw new Error("Photo upload preparation returned an unexpected response.");
  }
  return uploads;
};

const uploadPendingPhotosToStorage = async ({ uploads, orderedPendingPhotos }) => {
  await Promise.all(
    uploads.map(async (upload, index) => {
      const uploadResponse = await fetch(upload.url, {
        method: "PUT",
        headers: {
          "Content-Type": upload.contentType,
        },
        body: orderedPendingPhotos[index].file,
      });
      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload photo (${uploadResponse.status}).`);
      }
    })
  );
};

const confirmPendingPhotoUploads = async ({
  propertyId,
  uploads,
  orderedPendingPhotos,
  pendingOrderPosition,
}) => {
  const confirmResponse = await fetch(`${PROPERTY_API_BASE}/images/confirm`, {
    method: "POST",
    headers: {
      Authorization: getAccessToken(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      propertyId,
      images: uploads.map((upload, index) => ({
        imageId: upload.imageId,
        originalKey: upload.key,
        sortOrder: pendingOrderPosition.get(orderedPendingPhotos[index].id) ?? index,
      })),
    }),
  });

  if (!confirmResponse.ok) {
    const message = await getApiErrorMessage(confirmResponse, "Failed to finalize photo upload.");
    throw new Error(message);
  }
};

const uploadPendingPropertyPhotos = async ({
  propertyId,
  orderedPendingPhotos,
  pendingOrderPosition,
}) => {
  const uploads = await requestPhotoUploadSlots({ propertyId, orderedPendingPhotos });
  await uploadPendingPhotosToStorage({ uploads, orderedPendingPhotos });
  await confirmPendingPhotoUploads({
    propertyId,
    uploads,
    orderedPendingPhotos,
    pendingOrderPosition,
  });
  return new Map(
    orderedPendingPhotos.map((photo, index) => [photo.id, String(uploads[index]?.imageId || "")])
  );
};

const buildFinalPersistedPhotoOrder = ({
  normalizedOrderIds,
  existingById,
  pendingIdToPersistedId,
}) =>
  normalizedOrderIds
    .map((photoId) => {
      if (existingById.has(photoId)) {
        return photoId;
      }
      const mappedUploadedId = pendingIdToPersistedId.get(photoId);
      return mappedUploadedId || null;
    })
    .filter(Boolean);

const persistPropertyPhotoOrder = async ({ propertyId, finalPersistedOrder }) => {
  if (finalPersistedOrder.length === 0) {
    return;
  }

  const orderResponse = await fetch(`${PROPERTY_API_BASE}/images/order`, {
    method: "PATCH",
    headers: {
      Authorization: getAccessToken(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      propertyId,
      images: finalPersistedOrder.map((imageId, sortOrder) => ({
        imageId,
        sortOrder,
      })),
    }),
  });

  if (!orderResponse.ok) {
    const message = await getApiErrorMessage(orderResponse, "Failed to update photo order.");
    throw new Error(message);
  }
};

const getPhotoSaveSuccessMessage = (uploadedPhotoCount) => {
  if (uploadedPhotoCount > 0) {
    return `${uploadedPhotoCount} photo${uploadedPhotoCount === 1 ? "" : "s"} uploaded successfully.`;
  }
  return "Photo order updated successfully.";
};

const savePropertyPhotos = async ({
  propertyId,
  existingPhotos,
  pendingPhotos,
  photoOrderIds,
  hasPhotoOrderChanges,
}) => {
  const {
    persistedPhotos,
    queuedPhotos,
    existingById,
    normalizedOrderIds,
    orderedPendingPhotos,
  } = normalizePhotoSaveInput({
    existingPhotos,
    pendingPhotos,
    photoOrderIds,
  });

  if ((persistedPhotos.length + queuedPhotos.length) > MAX_PROPERTY_IMAGES) {
    throw new Error(`A listing can have up to ${MAX_PROPERTY_IMAGES} photos.`);
  }

  if (orderedPendingPhotos.length === 0 && !hasPhotoOrderChanges) {
    return buildNoPhotoChangesResult({ existingPhotos, pendingPhotos, photoOrderIds });
  }

  const pendingOrderPosition = new Map(normalizedOrderIds.map((photoId, index) => [photoId, index]));
  const pendingIdToPersistedId = orderedPendingPhotos.length > 0
    ? await uploadPendingPropertyPhotos({
        propertyId,
        orderedPendingPhotos,
        pendingOrderPosition,
      })
    : new Map();
  const finalPersistedOrder = buildFinalPersistedPhotoOrder({
    normalizedOrderIds,
    existingById,
    pendingIdToPersistedId,
  });

  await persistPropertyPhotoOrder({ propertyId, finalPersistedOrder });

  const verificationData = await fetchPropertySnapshot(propertyId);
  const refreshedPhotos = mapPropertyImagesToState(verificationData?.images);
  const uploadedPhotoCount = orderedPendingPhotos.length;

  return {
    nextExistingPhotos: refreshedPhotos,
    nextPendingPhotos: [],
    nextPhotoOrderIds: refreshedPhotos.map((photo) => photo.id),
    successMessage: getPhotoSaveSuccessMessage(uploadedPhotoCount),
    didUpload: uploadedPhotoCount > 0,
    didReorder: hasPhotoOrderChanges,
  };
};

const deletePropertyPhoto = async ({ propertyId, imageId }) => {
  const response = await fetch(`${PROPERTY_API_BASE}/images`, {
    method: "DELETE",
    headers: {
      Authorization: getAccessToken(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      propertyId,
      imageId,
    }),
  });

  if (!response.ok) {
    const apiErrorMessage = await getApiErrorMessage(response, "Failed to delete photo.");
    throw new Error(apiErrorMessage);
  }

  const verificationData = await fetchPropertySnapshot(propertyId);
  const refreshedPhotos = mapPropertyImagesToState(verificationData?.images);
  const stillExists = refreshedPhotos.some((photo) => photo.id === imageId);
  if (stillExists) {
    throw new Error("Photo deletion could not be confirmed on deployed backend yet.");
  }
  return refreshedPhotos;
};

const animatePhotoTileToNewPosition = (node, deltaX, deltaY) => {
  node.style.transition = "none";
  node.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
  node.style.willChange = "transform";

  node.getBoundingClientRect();
  requestAnimationFrame(() => {
    node.style.transition = "transform 220ms ease";
    node.style.transform = "translate(0, 0)";
  });

  const clearAnimationState = () => {
    node.style.transition = "";
    node.style.willChange = "";
    node.removeEventListener("transitionend", clearAnimationState);
  };
  node.addEventListener("transitionend", clearAnimationState);
};

const createInitialTouchReorderState = () => ({
  pointerId: null,
  sourcePhotoId: null,
  targetPhotoId: null,
  started: false,
  startX: 0,
  startY: 0,
  timerId: null,
});

const usePhotoTileInteractionHandlers = ({
  displayedPhotos,
  onPhotoTileDragStart,
  onPhotoTileDragOver,
  onPhotoTileDragEnd,
  onPhotoTileDrop,
  saving,
  deletingPhoto,
}) => {
  const touchReorderRef = useRef(createInitialTouchReorderState());

  const clearTouchReorderTimer = useCallback(() => {
    const timerId = touchReorderRef.current.timerId;
    if (!timerId) {
      return;
    }
    clearTimeout(timerId);
    touchReorderRef.current.timerId = null;
  }, []);

  const resetTouchReorderState = useCallback(() => {
    clearTouchReorderTimer();
    touchReorderRef.current.pointerId = null;
    touchReorderRef.current.sourcePhotoId = null;
    touchReorderRef.current.targetPhotoId = null;
    touchReorderRef.current.started = false;
    touchReorderRef.current.startX = 0;
    touchReorderRef.current.startY = 0;
  }, [clearTouchReorderTimer]);

  const resolveDropTargetPhotoId = useCallback((event) => {
    if (typeof document === "undefined") {
      return null;
    }
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const targetTile = element?.closest("[data-photo-id]");
    return targetTile?.dataset?.photoId || null;
  }, []);

  const handlePhotoTilePointerDown = useCallback((photoId, event) => {
    if (event.pointerType === "mouse" || saving) {
      return;
    }
    if (touchReorderRef.current.pointerId !== null) {
      return;
    }
    const interactiveTarget = event.target?.closest("button, input, textarea, select, a, [role='button']");
    if (interactiveTarget && interactiveTarget !== event.currentTarget) {
      return;
    }

    clearTouchReorderTimer();
    touchReorderRef.current.pointerId = event.pointerId;
    touchReorderRef.current.sourcePhotoId = photoId;
    touchReorderRef.current.targetPhotoId = photoId;
    touchReorderRef.current.started = false;
    touchReorderRef.current.startX = event.clientX;
    touchReorderRef.current.startY = event.clientY;
    touchReorderRef.current.timerId = setTimeout(() => {
      touchReorderRef.current.started = true;
      onPhotoTileDragStart(photoId);
      onPhotoTileDragOver(photoId);
    }, PHOTO_REORDER_LONG_PRESS_MS);
  }, [clearTouchReorderTimer, onPhotoTileDragOver, onPhotoTileDragStart, saving]);

  const handlePhotoTilePointerMove = useCallback((event) => {
    if (event.pointerType === "mouse") {
      return;
    }
    const touchReorderState = touchReorderRef.current;
    if (touchReorderState.pointerId !== event.pointerId) {
      return;
    }

    if (!touchReorderState.started) {
      const deltaX = event.clientX - touchReorderState.startX;
      const deltaY = event.clientY - touchReorderState.startY;
      const distance = Math.hypot(deltaX, deltaY);
      if (distance > PHOTO_REORDER_MOVE_CANCEL_PX) {
        resetTouchReorderState();
      }
      return;
    }

    event.preventDefault();
    const targetPhotoId = resolveDropTargetPhotoId(event) || touchReorderState.sourcePhotoId;
    if (!targetPhotoId) {
      return;
    }
    touchReorderState.targetPhotoId = targetPhotoId;
    onPhotoTileDragOver(targetPhotoId);
  }, [onPhotoTileDragOver, resetTouchReorderState, resolveDropTargetPhotoId]);

  const handlePhotoTilePointerUp = useCallback((event) => {
    if (event.pointerType === "mouse") {
      return;
    }
    const touchReorderState = touchReorderRef.current;
    if (touchReorderState.pointerId !== event.pointerId) {
      return;
    }
    clearTouchReorderTimer();
    if (!touchReorderState.started) {
      resetTouchReorderState();
      return;
    }

    event.preventDefault();
    const targetPhotoId =
      resolveDropTargetPhotoId(event) || touchReorderState.targetPhotoId || touchReorderState.sourcePhotoId;
    if (targetPhotoId) {
      onPhotoTileDrop(targetPhotoId);
    }
    onPhotoTileDragEnd();
    resetTouchReorderState();
  }, [clearTouchReorderTimer, onPhotoTileDragEnd, onPhotoTileDrop, resetTouchReorderState, resolveDropTargetPhotoId]);

  const handlePhotoTilePointerCancel = useCallback((event) => {
    if (event.pointerType === "mouse") {
      return;
    }
    const touchReorderState = touchReorderRef.current;
    if (touchReorderState.pointerId !== event.pointerId) {
      return;
    }
    if (touchReorderState.started) {
      onPhotoTileDragEnd();
    }
    resetTouchReorderState();
  }, [onPhotoTileDragEnd, resetTouchReorderState]);

  const movePhotoByKeyboard = useCallback((photoId, delta) => {
    const fromIndex = displayedPhotos.findIndex((photo) => photo.id === photoId);
    if (fromIndex === -1) {
      return;
    }
    const toIndex = Math.max(0, Math.min(displayedPhotos.length - 1, fromIndex + delta));
    if (toIndex === fromIndex) {
      return;
    }
    const targetPhotoId = displayedPhotos[toIndex]?.id;
    if (!targetPhotoId || targetPhotoId === photoId) {
      return;
    }
    onPhotoTileDragStart(photoId);
    onPhotoTileDrop(targetPhotoId);
    onPhotoTileDragEnd();
  }, [displayedPhotos, onPhotoTileDragEnd, onPhotoTileDragStart, onPhotoTileDrop]);

  const handlePhotoTileKeyDown = useCallback((photoId, event) => {
    if (saving || deletingPhoto) {
      return;
    }
    const delta = PHOTO_REORDER_KEY_DELTAS[event.key];
    if (delta === undefined) {
      return;
    }
    event.preventDefault();
    movePhotoByKeyboard(photoId, delta);
  }, [deletingPhoto, movePhotoByKeyboard, saving]);

  useEffect(() => {
    return () => {
      clearTouchReorderTimer();
    };
  }, [clearTouchReorderTimer]);

  return {
    handlePhotoTilePointerDown,
    handlePhotoTilePointerMove,
    handlePhotoTilePointerUp,
    handlePhotoTilePointerCancel,
    handlePhotoTileKeyDown,
  };
};

function HostPropertyLoadingView() {
  return (
    <main className="page-Host">
      <p className="page-Host-title">Listing editor</p>
      <div className="page-Host-content">
        <section className={`host-pc-dashboard ${styles.editorShell}`}>
          <div className={styles.loaderWrap}>
            <ClipLoader size={80} color="#0D9813" loading />
            <p className={styles.loaderText}>Loading property details...</p>
          </div>
        </section>
      </div>
    </main>
  );
}

function HostPropertyUnsavedChangesModal({ open, onStay, onLeave }) {
  if (!open) {
    return null;
  }

  return (
    <dialog
      open
      className={styles.unsavedModalOverlay}
      aria-labelledby="unsaved-modal-title"
      onCancel={(event) => {
        event.preventDefault();
        onStay();
      }}
    >
      <section className={styles.unsavedModal}>
        <h4 id="unsaved-modal-title" className={styles.unsavedModalTitle}>
          You have unsaved changes
        </h4>
        <p className={styles.unsavedModalDescription}>
          If you leave now, your unsaved edits will be lost.
        </p>
        <div className={styles.unsavedModalActions}>
          <button type="button" className={styles.unsavedStayButton} onClick={onStay}>
            Stay
          </button>
          <button type="button" className={styles.unsavedLeaveButton} onClick={onLeave}>
            Leave
          </button>
        </div>
      </section>
    </dialog>
  );
}

function HostPropertyTabs({ selectedTab, onSelectTab, saving }) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Listing editor tabs">
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          className={`${styles.tab} ${selectedTab === tab ? styles.tabActive : ""}`}
          onClick={() => onSelectTab(tab)}
          aria-selected={selectedTab === tab}
          disabled={saving}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

function HostPropertyListingSummary({
  propertyId,
  hostProperties,
  title,
  statusLabel,
  statusDotClass,
  onPropertyChange,
  saving,
}) {
  return (
    <article className={styles.listingSummary}>
      <select
        id="listing-selector"
        value={propertyId || ""}
        onChange={onPropertyChange}
        className={styles.listingSelect}
        disabled={saving}
      >
        {hostProperties.length > 0 ? (
          hostProperties.map((accommodation) => (
            <option key={accommodation.id} value={accommodation.id}>
              {accommodation.title}
            </option>
          ))
        ) : (
          <option value={propertyId || ""}>{title || "Untitled listing"}</option>
        )}
      </select>
      <p className={styles.listingStatus}>
        <span className={`${styles.statusDot} ${statusDotClass}`} />
        {statusLabel}
      </p>
    </article>
  );
}

function HostPropertyOverviewTab({
  form,
  updateField,
  displayedPropertyType,
  setCapacity,
  capacity,
  adjustCapacityField,
  updateCapacityField,
  address,
  updateAddressField,
}) {
  return (
    <section className={styles.card}>
      <h3 className={styles.sectionTitle}>Property Information</h3>
      <div className={styles.field}>
        <label htmlFor="property-title">Title</label>
        <input
          id="property-title"
          type="text"
          value={form.title}
          onChange={(event) => updateField("title", event.target.value)}
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="property-description">Description</label>
        <textarea
          id="property-description"
          value={form.description}
          onChange={(event) => updateField("description", event.target.value)}
          rows={5}
          className={styles.textarea}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="property-subtitle">Subtitle</label>
        <input
          id="property-subtitle"
          type="text"
          value={form.subtitle}
          onChange={(event) => updateField("subtitle", event.target.value)}
          className={styles.input}
        />
      </div>

      <div className={styles.sectionDivider} />

      <h3 className={styles.sectionTitle}>Capacity</h3>
      <div className={styles.field}>
        <label htmlFor="property-type">Property type</label>
        <select
          id="property-type"
          className={styles.input}
          value={displayedPropertyType}
          onChange={(event) => setCapacity((prev) => ({ ...prev, propertyType: event.target.value }))}
        >
          {!SPACE_TYPE_OPTIONS.includes(displayedPropertyType) && (
            <option value={displayedPropertyType}>{displayedPropertyType}</option>
          )}
          {SPACE_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.capacityGrid}>
        <div className={styles.counterItem}>
          <span className={styles.counterLabel}>Guests</span>
          <div className={styles.counterControl}>
            <button type="button" className={styles.counterButton} onClick={() => adjustCapacityField("guests", -1)}>
              -
            </button>
            <input
              type="number"
              min={0}
              max={MAX_CAPACITY_VALUE}
              value={capacity.guests}
              onChange={(event) => updateCapacityField("guests", event.target.value)}
              className={styles.counterValue}
            />
            <button
              type="button"
              className={`${styles.counterButton} ${styles.counterButtonPlus}`}
              onClick={() => adjustCapacityField("guests", 1)}
            >
              +
            </button>
          </div>
        </div>

        <div className={styles.counterItem}>
          <span className={styles.counterLabel}>Bedrooms</span>
          <div className={styles.counterControl}>
            <button type="button" className={styles.counterButton} onClick={() => adjustCapacityField("bedrooms", -1)}>
              -
            </button>
            <input
              type="number"
              min={0}
              max={MAX_CAPACITY_VALUE}
              value={capacity.bedrooms}
              onChange={(event) => updateCapacityField("bedrooms", event.target.value)}
              className={styles.counterValue}
            />
            <button
              type="button"
              className={`${styles.counterButton} ${styles.counterButtonPlus}`}
              onClick={() => adjustCapacityField("bedrooms", 1)}
            >
              +
            </button>
          </div>
        </div>

        <div className={styles.counterItem}>
          <span className={styles.counterLabel}>Beds</span>
          <div className={styles.counterControl}>
            <button type="button" className={styles.counterButton} onClick={() => adjustCapacityField("beds", -1)}>
              -
            </button>
            <input
              type="number"
              min={0}
              max={MAX_CAPACITY_VALUE}
              value={capacity.beds}
              onChange={(event) => updateCapacityField("beds", event.target.value)}
              className={styles.counterValue}
            />
            <button
              type="button"
              className={`${styles.counterButton} ${styles.counterButtonPlus}`}
              onClick={() => adjustCapacityField("beds", 1)}
            >
              +
            </button>
          </div>
        </div>

        <div className={styles.counterItem}>
          <span className={styles.counterLabel}>Bathrooms</span>
          <div className={styles.counterControl}>
            <button
              type="button"
              className={styles.counterButton}
              onClick={() => adjustCapacityField("bathrooms", -1)}
            >
              -
            </button>
            <input
              type="number"
              min={0}
              max={MAX_CAPACITY_VALUE}
              value={capacity.bathrooms}
              onChange={(event) => updateCapacityField("bathrooms", event.target.value)}
              className={styles.counterValue}
            />
            <button
              type="button"
              className={`${styles.counterButton} ${styles.counterButtonPlus}`}
              onClick={() => adjustCapacityField("bathrooms", 1)}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className={styles.sectionDivider} />

      <h3 className={styles.sectionTitle}>Location</h3>
      <p className={styles.locationNote}>
        Guests only see the approximate location until booking is confirmed.
      </p>

      <div className={styles.locationGridTwo}>
        <div className={styles.field}>
          <label htmlFor="location-street">Street</label>
          <input
            id="location-street"
            type="text"
            value={address.street}
            onChange={(event) => updateAddressField("street", event.target.value)}
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="location-house-number">House number</label>
          <input
            id="location-house-number"
            type="text"
            value={address.houseNumber}
            onChange={(event) => updateAddressField("houseNumber", event.target.value)}
            className={styles.input}
          />
        </div>
      </div>

      <div className={styles.locationGridThree}>
        <div className={styles.field}>
          <label htmlFor="location-postal-code">Postal code</label>
          <input
            id="location-postal-code"
            type="text"
            value={address.postalCode}
            onChange={(event) => updateAddressField("postalCode", event.target.value)}
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="location-city">City</label>
          <input
            id="location-city"
            type="text"
            value={address.city}
            onChange={(event) => updateAddressField("city", event.target.value)}
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="location-country">Country</label>
          <input
            id="location-country"
            type="text"
            value={address.country}
            onChange={(event) => updateAddressField("country", event.target.value)}
            className={styles.input}
          />
        </div>
      </div>

      <div className={styles.mapPreview}>
        <p className={styles.mapPreviewLabel}>Map preview</p>
        <p className={styles.mapPreviewAddress}>
          {[address.street, address.houseNumber, address.postalCode, address.city, address.country]
            .filter(Boolean)
            .join(", ") || "Address details are not fully available yet."}
        </p>
      </div>
    </section>
  );
}

function HostPropertyPhotosTab({
  displayedPhotos,
  pendingPhotoCount,
  onOpenPhotoPicker,
  onPhotoFilesSelected,
  onPhotoDrop,
  onPhotoDragOver,
  onPhotoDragLeave,
  isPhotoDragOver,
  onRequestDeletePhoto,
  onPhotoTileDragStart,
  onPhotoTileDragEnd,
  onPhotoTileDragOver,
  onPhotoTileDragLeave,
  onPhotoTileDrop,
  draggingPhotoId,
  photoDropTargetId,
  saving,
  deletingPhoto,
  photoInputRef,
}) {
  const photoTileRefs = useRef(new Map());
  const previousTileRectsRef = useRef(new Map());
  const coverPhoto = displayedPhotos[0] || null;
  const gridPhotos = displayedPhotos.slice(1);
  const totalPhotoCount = displayedPhotos.length;
  const {
    handlePhotoTilePointerDown,
    handlePhotoTilePointerMove,
    handlePhotoTilePointerUp,
    handlePhotoTilePointerCancel,
    handlePhotoTileKeyDown,
  } = usePhotoTileInteractionHandlers({
    displayedPhotos,
    onPhotoTileDragStart,
    onPhotoTileDragOver,
    onPhotoTileDragEnd,
    onPhotoTileDrop,
    saving,
    deletingPhoto,
  });

  useLayoutEffect(() => {
    const nextRects = new Map();
    displayedPhotos.forEach((photo) => {
      const node = photoTileRefs.current.get(photo.id);
      if (node) {
        nextRects.set(photo.id, node.getBoundingClientRect());
      }
    });

    const previousRects = previousTileRectsRef.current;
    nextRects.forEach((nextRect, photoId) => {
      const previousRect = previousRects.get(photoId);
      if (!previousRect) {
        return;
      }
      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
        return;
      }
      const node = photoTileRefs.current.get(photoId);
      if (!node) {
        return;
      }
      animatePhotoTileToNewPosition(node, deltaX, deltaY);
    });

    previousTileRectsRef.current = nextRects;
  }, [displayedPhotos]);

  const renderCoverTile = () => {
    if (!coverPhoto) {
      return (
        <div className={styles.photoTileLarge}>
          <span className={styles.photoEmptyLabel}>No photos yet</span>
        </div>
      );
    }

    return (
      <div
        className={`${styles.photoTileActionWrap} ${styles.photoTileActionWrapLarge}`}
        data-photo-id={coverPhoto.id}
        ref={(node) => {
          if (node) {
            photoTileRefs.current.set(coverPhoto.id, node);
            return;
          }
          photoTileRefs.current.delete(coverPhoto.id);
        }}
      >
        <button
          type="button"
          className={`${styles.photoTileLarge} ${
            draggingPhotoId === coverPhoto.id ? styles.photoTileDragActive : ""
          } ${photoDropTargetId === coverPhoto.id ? styles.photoTileDropTarget : ""} ${
            coverPhoto.isPending ? styles.photoTilePending : ""
          }`}
          data-photo-id={coverPhoto.id}
          draggable
          onDragStart={() => onPhotoTileDragStart(coverPhoto.id)}
          onDragEnd={onPhotoTileDragEnd}
          onDragOver={(event) => {
            event.preventDefault();
            onPhotoTileDragOver(coverPhoto.id);
          }}
          onDragLeave={() => onPhotoTileDragLeave(coverPhoto.id)}
          onDrop={(event) => {
            event.preventDefault();
            onPhotoTileDrop(coverPhoto.id);
          }}
          onPointerDown={(event) => handlePhotoTilePointerDown(coverPhoto.id, event)}
          onPointerMove={handlePhotoTilePointerMove}
          onPointerUp={handlePhotoTilePointerUp}
          onPointerCancel={handlePhotoTilePointerCancel}
          onKeyDown={(event) => handlePhotoTileKeyDown(coverPhoto.id, event)}
          aria-label="Reorder cover tile"
        >
          <img src={coverPhoto.src} alt="Cover" className={styles.photoImageLarge} />
          {coverPhoto.isPending ? null : (
            <span className={styles.photoCheck} aria-hidden="true">
              <img src={checkIcon} alt="" aria-hidden="true" className={styles.photoCheckIcon} />
            </span>
          )}
          {coverPhoto.isPending ? <span className={styles.photoPendingBadge}>New - Unsaved</span> : null}
        </button>
        <button
          type="button"
          className={styles.photoRemoveButton}
          onClick={() => onRequestDeletePhoto(coverPhoto)}
          disabled={saving || deletingPhoto}
          aria-label="Delete photo"
        >
          <img src={crossIcon} alt="" aria-hidden="true" className={styles.photoRemoveIcon} />
        </button>
      </div>
    );
  };

  const renderGridTiles = () => {
    if (gridPhotos.length === 0) {
      return (
        <div className={styles.photoTileSmall}>
          <span className={styles.photoTilePlaceholder}>Additional photos will appear here.</span>
        </div>
      );
    }

    return gridPhotos.map((photo, index) => (
      <div
        key={photo.id}
        className={`${styles.photoTileActionWrap} ${styles.photoTileActionWrapSmall}`}
        data-photo-id={photo.id}
        ref={(node) => {
          if (node) {
            photoTileRefs.current.set(photo.id, node);
          } else {
            photoTileRefs.current.delete(photo.id);
          }
        }}
      >
        <button
          type="button"
          className={`${styles.photoTileSmall} ${
            draggingPhotoId === photo.id ? styles.photoTileDragActive : ""
          } ${photoDropTargetId === photo.id ? styles.photoTileDropTarget : ""} ${
            photo.isPending ? styles.photoTilePending : ""
          }`}
          data-photo-id={photo.id}
          draggable
          onDragStart={() => onPhotoTileDragStart(photo.id)}
          onDragEnd={onPhotoTileDragEnd}
          onDragOver={(event) => {
            event.preventDefault();
            onPhotoTileDragOver(photo.id);
          }}
          onDragLeave={() => onPhotoTileDragLeave(photo.id)}
          onDrop={(event) => {
            event.preventDefault();
            onPhotoTileDrop(photo.id);
          }}
          onPointerDown={(event) => handlePhotoTilePointerDown(photo.id, event)}
          onPointerMove={handlePhotoTilePointerMove}
          onPointerUp={handlePhotoTilePointerUp}
          onPointerCancel={handlePhotoTilePointerCancel}
          onKeyDown={(event) => handlePhotoTileKeyDown(photo.id, event)}
          aria-label={`Reorder listing view ${index + 2}`}
        >
          <img src={photo.src} alt={`Listing view ${index + 2}`} className={styles.photoImageSmall} />
          {photo.isPending ? null : (
            <span className={styles.photoCheck} aria-hidden="true">
              <img src={checkIcon} alt="" aria-hidden="true" className={styles.photoCheckIcon} />
            </span>
          )}
          {photo.isPending ? <span className={styles.photoPendingBadge}>New - Unsaved</span> : null}
        </button>
        <button
          type="button"
          className={styles.photoRemoveButton}
          onClick={() => onRequestDeletePhoto(photo)}
          disabled={saving || deletingPhoto}
          aria-label="Delete photo"
        >
          <img src={crossIcon} alt="" aria-hidden="true" className={styles.photoRemoveIcon} />
        </button>
      </div>
    ));
  };

  return (
    <section className={`${styles.card} ${styles.photosCard}`}>
      <h3 className={styles.sectionTitle}>Photos</h3>
      <p className={styles.photosSubtitle}>Upload and manage photos for your listing.</p>

      <div className={styles.photosLayout}>
        <div className={styles.photosPrimaryColumn}>
          {renderCoverTile()}
          <p className={styles.photoCoverCaption}>Cover photo</p>

          <button
            type="button"
            className={`${styles.photoAddButton} ${isPhotoDragOver ? styles.photoAddButtonDragOver : ""}`}
            onClick={onOpenPhotoPicker}
            onDragOver={onPhotoDragOver}
            onDragLeave={onPhotoDragLeave}
            onDrop={onPhotoDrop}
            disabled={saving}
          >
            <span className={styles.photoAddIcon}>+</span>
            <span>Add photos</span>
          </button>

          <input
            ref={photoInputRef}
            type="file"
            accept={PHOTO_ACCEPT}
            multiple
            className={styles.photoInputHidden}
            onChange={onPhotoFilesSelected}
            disabled={saving}
          />
        </div>

        <div className={styles.photosSecondaryGrid}>
          {renderGridTiles()}
        </div>
      </div>

      <div className={styles.photoCategoryGrid}>
        {PHOTO_CATEGORY_PLACEHOLDERS.map((category) => (
          <article key={category} className={styles.photoCategoryItem}>
            <span className={styles.photoCategoryName}>{category}</span>
            <button
              type="button"
              className={styles.photoCategoryAddButton}
              onClick={onOpenPhotoPicker}
              disabled={saving}
            >
              +Add
            </button>
          </article>
        ))}
      </div>

      <p className={styles.photosHint}>
        <img src={infoIcon} alt="" aria-hidden="true" className={styles.policiesHintIcon} />{" "}
        Listings with 10+ high-quality photos receive 30% more bookings.
      </p>

      <p className={styles.photosMeta}>
        {totalPhotoCount} / {MAX_PROPERTY_IMAGES} photos
        {pendingPhotoCount > 0 ? ` (${pendingPhotoCount} pending save)` : ""}
      </p>
    </section>
  );
}

function HostPropertyPhotoDeleteModal({
  open,
  photoSrc,
  deletingPhoto,
  onCancel,
  onConfirm,
}) {
  if (!open) {
    return null;
  }

  return (
    <dialog
      open
      className={styles.photoDeleteModalOverlay}
      aria-labelledby="photo-delete-modal-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!deletingPhoto) {
          onCancel();
        }
      }}
    >
      <section className={styles.photoDeleteModal}>
        <img src={photoSrc} alt="Selected listing preview" className={styles.photoDeletePreview} />

        <h4 id="photo-delete-modal-title" className={styles.photoDeleteTitle}>
          Delete this photo?
        </h4>
        <p className={styles.photoDeleteDescription}>
          This photo will be permanently removed from your listing.
        </p>

        <div className={styles.photoDeleteActions}>
          <button
            type="button"
            className={styles.photoDeleteCancelButton}
            onClick={onCancel}
            disabled={deletingPhoto}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.photoDeleteConfirmButton}
            onClick={onConfirm}
            disabled={deletingPhoto}
          >
            {deletingPhoto ? "Deleting..." : "Delete"}
          </button>
        </div>
      </section>
    </dialog>
  );
}

function HostPropertyAmenitiesTab({
  amenityCategoryKeys,
  amenitiesByCategory,
  expandedAmenityCategories,
  selectedAmenityCountByCategory,
  selectedAmenityIdSet,
  toggleAmenityCategory,
  toggleAmenitySelection,
}) {
  return (
    <section className={`${styles.card} ${styles.amenitiesCard}`}>
      <h3 className={styles.sectionTitle}>Amenities</h3>
      <p className={styles.amenitiesSubtitle}>
        Highlight the amenities and features your property offers.
      </p>

      <div className={styles.amenitiesAccordion}>
        {amenityCategoryKeys.map((category) => {
          const categoryAmenities = amenitiesByCategory[category] || [];
          const isExpanded = Boolean(expandedAmenityCategories[category]);
          const selectedCount = selectedAmenityCountByCategory[category] || 0;

          return (
            <article key={category} className={styles.amenityCategoryItem}>
              <button
                type="button"
                className={styles.amenityCategoryHeader}
                onClick={() => toggleAmenityCategory(category)}
                aria-expanded={isExpanded}
              >
                <span className={styles.amenityCategoryTitle}>
                  {category}{" "}
                  <span className={styles.amenityCategoryCount}>
                    ({selectedCount} out of {categoryAmenities.length} selected)
                  </span>
                </span>
                <span className={styles.amenityCategoryChevron}>
                  <img
                    src={isExpanded ? arrowUpIcon : arrowDownIcon}
                    alt=""
                    aria-hidden="true"
                    className={styles.amenityCategoryChevronIcon}
                  />
                </span>
              </button>

              <div
                className={`${styles.amenityCategoryBody} ${
                  isExpanded ? styles.amenityCategoryBodyOpen : ""
                }`}
                aria-hidden={!isExpanded}
              >
                <div className={styles.amenityCheckboxGrid}>
                  {categoryAmenities.map((amenity) => {
                    const amenityId = String(amenity.id);
                    const checked = selectedAmenityIdSet.has(amenityId);
                    return (
                      <label key={amenityId} className={styles.amenityCheckboxItem}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAmenitySelection(amenityId)}
                        />
                        <span>{amenity.amenity}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <p className={styles.amenitiesHint}>Listings with popular amenities like Wi-Fi receive more bookings.</p>
    </section>
  );
}

function HostPropertyPricingDiscountRow({
  title,
  description,
  enabled,
  onToggle,
  percentValue,
  percentOptions,
  onPercentChange,
  timingLabel,
  timingValue,
  timingOptions,
  onTimingChange,
}) {
  return (
    <article className={styles.pricingDiscountRow}>
      <label className={styles.pricingDiscountToggleWrap}>
        <input
          type="checkbox"
          className={styles.pricingDiscountToggleInput}
          checked={enabled}
          onChange={(event) => onToggle(event.target.checked)}
        />
        <span className={styles.pricingDiscountToggle} aria-hidden="true" />
        <span className={styles.pricingDiscountText}>
          <span className={styles.pricingDiscountTitle}>{title}</span>
          <span className={styles.pricingDiscountDescription}>{description}</span>
        </span>
      </label>

      <div className={styles.pricingDiscountControls}>
        {timingLabel ? (
          <label className={styles.pricingDiscountSelectWrap}>
            <span className={styles.pricingDiscountSelectLabel}>{timingLabel}</span>
            <select
              className={styles.pricingSelect}
              value={timingValue}
              onChange={(event) => onTimingChange(Number(event.target.value))}
              disabled={!enabled}
            >
              {timingOptions.map((option) => (
                <option key={option} value={option}>
                  {option} days before check in
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className={styles.pricingDiscountSelectWrap}>
          <span className={styles.pricingDiscountSelectLabel}>Amount</span>
          <select
            className={styles.pricingSelect}
            value={percentValue}
            onChange={(event) => onPercentChange(Number(event.target.value))}
            disabled={!enabled}
          >
            {percentOptions.map((percent) => (
              <option key={percent} value={percent}>
                {percent}%
              </option>
            ))}
          </select>
        </label>
      </div>
    </article>
  );
}

function HostPropertyPricingTab({ pricingForm, setPricingForm }) {
  const minimumStayOptions = getSelectOptionsWithCurrent(PRICING_STAY_OPTIONS, pricingForm.minimumStay);
  const maximumStayOptions = getSelectOptionsWithCurrent(PRICING_MAX_STAY_OPTIONS, pricingForm.maximumStay);
  const weeklyPercentOptions = getSelectOptionsWithCurrent(
    PRICING_DISCOUNT_PERCENT_OPTIONS,
    pricingForm.weeklyDiscountPercent
  );
  const monthlyPercentOptions = getSelectOptionsWithCurrent(
    PRICING_DISCOUNT_PERCENT_OPTIONS,
    pricingForm.monthlyDiscountPercent
  );
  const lastMinutePercentOptions = getSelectOptionsWithCurrent(
    PRICING_DISCOUNT_PERCENT_OPTIONS,
    pricingForm.lastMinuteDiscountPercent
  );
  const earlyBirdPercentOptions = getSelectOptionsWithCurrent(
    PRICING_DISCOUNT_PERCENT_OPTIONS,
    pricingForm.earlyBirdDiscountPercent
  );
  const lastMinuteDayOptions = getSelectOptionsWithCurrent(
    PRICING_LAST_MINUTE_DAY_OPTIONS,
    pricingForm.lastMinuteDiscountDays
  );
  const earlyBirdDayOptions = getSelectOptionsWithCurrent(
    PRICING_EARLY_BIRD_DAY_OPTIONS,
    pricingForm.earlyBirdDiscountDays
  );

  const updatePricingForm = (patch) => {
    setPricingForm((previous) => normalizePricingForm({ ...previous, ...patch }));
  };

  return (
    <section className={`${styles.card} ${styles.pricingCard}`}>
      <h3 className={styles.sectionTitle}>Pricing</h3>
      <p className={styles.pricingSubtitle}>Define the pricing settings for your listing.</p>

      <div className={styles.pricingBasePanel}>
        <div className={styles.pricingRateRow}>
          <label htmlFor="pricing-nightly-rate" className={styles.pricingRateLabel}>
            Nightly rate
          </label>
          <div className={styles.pricingRateInputWrap}>
            <span aria-hidden="true" className={styles.pricingRateCurrency}>EUR</span>
            <input
              id="pricing-nightly-rate"
              type="number"
              min={PRICING_MIN_NIGHTLY_RATE}
              max={PRICING_MAX_NIGHTLY_RATE}
              step={1}
              className={styles.pricingRateInput}
              value={pricingForm.nightlyRate}
              onChange={(event) => updatePricingForm({ nightlyRate: event.target.value })}
            />
          </div>
        </div>

        <p className={styles.pricingBaseHint}>
          Set the base nightly rate guests will be charged.
        </p>

        <div className={styles.pricingStayGrid}>
          <label className={styles.pricingStayField}>
            <span className={styles.pricingStayLabel}>Minimum stay</span>
            <select
              className={styles.pricingSelect}
              value={pricingForm.minimumStay}
              onChange={(event) => {
                const nextMinimumStay = Number(event.target.value);
                const nextMaximumStay = pricingForm.maximumStay !== 0 && pricingForm.maximumStay < nextMinimumStay
                  ? nextMinimumStay
                  : pricingForm.maximumStay;
                updatePricingForm({
                  minimumStay: nextMinimumStay,
                  maximumStay: nextMaximumStay,
                });
              }}
            >
              {minimumStayOptions.map((value) => (
                <option key={value} value={value}>
                  {getStayOptionLabel(value)}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.pricingStayField}>
            <span className={styles.pricingStayLabel}>Maximum stay</span>
            <select
              className={styles.pricingSelect}
              value={pricingForm.maximumStay}
              onChange={(event) => updatePricingForm({ maximumStay: Number(event.target.value) })}
            >
              {maximumStayOptions.map((value) => (
                <option key={value} value={value}>
                  {getStayOptionLabel(value)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <h3 className={styles.sectionTitle}>Discounts</h3>

      <div className={styles.pricingDiscountList}>
        <HostPropertyPricingDiscountRow
          title="Weekly discount"
          description="Discount applied to stays of 7+ nights."
          enabled={pricingForm.weeklyDiscountEnabled}
          onToggle={(enabled) => updatePricingForm({
            weeklyDiscountEnabled: enabled,
            weeklyDiscountPercent: enabled && pricingForm.weeklyDiscountPercent === 0
              ? createInitialPricingForm().weeklyDiscountPercent
              : pricingForm.weeklyDiscountPercent,
          })}
          percentValue={pricingForm.weeklyDiscountPercent}
          percentOptions={weeklyPercentOptions}
          onPercentChange={(value) => updatePricingForm({ weeklyDiscountPercent: value })}
        />
        <HostPropertyPricingDiscountRow
          title="Monthly discount"
          description="Discount applied to stays of 28+ nights."
          enabled={pricingForm.monthlyDiscountEnabled}
          onToggle={(enabled) => updatePricingForm({
            monthlyDiscountEnabled: enabled,
            monthlyDiscountPercent: enabled && pricingForm.monthlyDiscountPercent === 0
              ? createInitialPricingForm().monthlyDiscountPercent
              : pricingForm.monthlyDiscountPercent,
          })}
          percentValue={pricingForm.monthlyDiscountPercent}
          percentOptions={monthlyPercentOptions}
          onPercentChange={(value) => updatePricingForm({ monthlyDiscountPercent: value })}
        />
        <HostPropertyPricingDiscountRow
          title="Last minute discount"
          description="Discount applied to bookings made within days of check-in."
          enabled={pricingForm.lastMinuteDiscountEnabled}
          onToggle={(enabled) => updatePricingForm({
            lastMinuteDiscountEnabled: enabled,
            lastMinuteDiscountDays: enabled && pricingForm.lastMinuteDiscountDays === 0
              ? createInitialPricingForm().lastMinuteDiscountDays
              : pricingForm.lastMinuteDiscountDays,
            lastMinuteDiscountPercent: enabled && pricingForm.lastMinuteDiscountPercent === 0
              ? createInitialPricingForm().lastMinuteDiscountPercent
              : pricingForm.lastMinuteDiscountPercent,
          })}
          percentValue={pricingForm.lastMinuteDiscountPercent}
          percentOptions={lastMinutePercentOptions}
          onPercentChange={(value) => updatePricingForm({ lastMinuteDiscountPercent: value })}
          timingLabel="Timing"
          timingValue={pricingForm.lastMinuteDiscountDays}
          timingOptions={lastMinuteDayOptions}
          onTimingChange={(value) => updatePricingForm({ lastMinuteDiscountDays: value })}
        />
        <HostPropertyPricingDiscountRow
          title="Early bird discount"
          description="Discount applied to bookings made at least selected days in advance."
          enabled={pricingForm.earlyBirdDiscountEnabled}
          onToggle={(enabled) => updatePricingForm({
            earlyBirdDiscountEnabled: enabled,
            earlyBirdDiscountDays: enabled && pricingForm.earlyBirdDiscountDays === 0
              ? createInitialPricingForm().earlyBirdDiscountDays
              : pricingForm.earlyBirdDiscountDays,
            earlyBirdDiscountPercent: enabled && pricingForm.earlyBirdDiscountPercent === 0
              ? createInitialPricingForm().earlyBirdDiscountPercent
              : pricingForm.earlyBirdDiscountPercent,
          })}
          percentValue={pricingForm.earlyBirdDiscountPercent}
          percentOptions={earlyBirdPercentOptions}
          onPercentChange={(value) => updatePricingForm({ earlyBirdDiscountPercent: value })}
          timingLabel="Timing"
          timingValue={pricingForm.earlyBirdDiscountDays}
          timingOptions={earlyBirdDayOptions}
          onTimingChange={(value) => updatePricingForm({ earlyBirdDiscountDays: value })}
        />
      </div>

      <p className={styles.pricingHint}>
        <img src={infoIcon} alt="" aria-hidden="true" className={styles.policiesHintIcon} />{" "}
        Strategic discounts can help increase occupancy and revenue.
      </p>
    </section>
  );
}

function HostPropertyPoliciesTab({ policyRules, updatePolicyRule, handleDeletePropertyClick, saving }) {
  return (
    <>
      <section className={`${styles.card} ${styles.policiesCard}`}>
        <h3 className={styles.sectionTitle}>Policies</h3>
        <p className={styles.policiesSubtitle}>
          Add important policies that guests must follow during their stay.
        </p>

        <div className={styles.policiesRulesPanel}>
          <header className={styles.policiesRulesHeader}>House rules</header>
          <div className={styles.policiesRulesList}>
            {POLICY_RULE_CONFIG.map((ruleConfig) => {
              const currentRuleValue = Boolean(policyRules[ruleConfig.rule]);
              const isChecked = ruleConfig.invert ? !currentRuleValue : currentRuleValue;
              return (
                <label key={ruleConfig.rule} className={styles.policyRuleRow}>
                  <span className={styles.policyRuleLabel}>{ruleConfig.label}</span>
                  <input
                    type="checkbox"
                    className={styles.policyRuleInput}
                    checked={isChecked}
                    onChange={(event) => {
                      const nextRuleValue = ruleConfig.invert ? !event.target.checked : event.target.checked;
                      updatePolicyRule(ruleConfig.rule, nextRuleValue);
                    }}
                  />
                  <span className={styles.policyRuleSwitch} aria-hidden="true" />
                </label>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.deletePropertyPanel}>
        <div className={styles.deletePropertyText}>
          <h4 className={styles.deletePropertyTitle}>Delete property</h4>
          <p className={styles.deletePropertyDescription}>
            This will permanently remove this listing, its calendar and related data.
          </p>
        </div>
        <button
          type="button"
          className={styles.deletePropertyButton}
          onClick={handleDeletePropertyClick}
          disabled={saving}
        >
          Delete permanently
        </button>
      </section>

      <p className={styles.policiesHint}>
        <img src={infoIcon} alt="" aria-hidden="true" className={styles.policiesHintIcon} />
        {" "}
        Clear policies help set expectations and avoid misunderstandings with guests.
      </p>
    </>
  );
}

function HostPropertyPlaceholderTab({ selectedTab }) {
  return (
    <section className={`${styles.card} ${styles.placeholderCard}`}>
      <p className={styles.placeholderBadge}>Coming soon</p>
      <h3 className={styles.sectionTitle}>{selectedTab}</h3>
      <p className={styles.placeholderText}>
        Editing for {selectedTab.toLowerCase()} is not available yet. We will enable this tab in a next rollout.
      </p>
    </section>
  );
}

function HostPropertyActions({ onBack, onSave, saving, saveEnabled }) {
  let saveButtonLabel = "Save changes";
  if (saveEnabled && saving) {
    saveButtonLabel = "Saving...";
  }
  return (
    <div className={styles.actions}>
      <button className={styles.actionButton} onClick={onBack} disabled={saving}>
        Back to listings
      </button>
      <button className={styles.actionButton} onClick={onSave} disabled={saving || !saveEnabled}>
        {saveButtonLabel}
      </button>
    </div>
  );
}

function HostPropertyTabContent({
  selectedTab,
  form,
  updateField,
  displayedPropertyType,
  setCapacity,
  capacity,
  adjustCapacityField,
  updateCapacityField,
  address,
  updateAddressField,
  displayedPhotos,
  pendingPhotoCount,
  onOpenPhotoPicker,
  onPhotoFilesSelected,
  onPhotoDrop,
  onPhotoDragOver,
  onPhotoDragLeave,
  isPhotoDragOver,
  onRequestDeletePhoto,
  onPhotoTileDragStart,
  onPhotoTileDragEnd,
  onPhotoTileDragOver,
  onPhotoTileDragLeave,
  onPhotoTileDrop,
  draggingPhotoId,
  photoDropTargetId,
  deletingPhoto,
  photoInputRef,
  amenityCategoryKeys,
  amenitiesByCategory,
  expandedAmenityCategories,
  selectedAmenityCountByCategory,
  selectedAmenityIdSet,
  toggleAmenityCategory,
  toggleAmenitySelection,
  pricingForm,
  setPricingForm,
  policyRules,
  updatePolicyRule,
  handleDeletePropertyClick,
  saving,
}) {
  switch (selectedTab) {
    case "Overview":
      return (
        <HostPropertyOverviewTab
          form={form}
          updateField={updateField}
          displayedPropertyType={displayedPropertyType}
          setCapacity={setCapacity}
          capacity={capacity}
          adjustCapacityField={adjustCapacityField}
          updateCapacityField={updateCapacityField}
          address={address}
          updateAddressField={updateAddressField}
        />
      );
    case "Photos":
      return (
        <HostPropertyPhotosTab
          displayedPhotos={displayedPhotos}
          pendingPhotoCount={pendingPhotoCount}
          onOpenPhotoPicker={onOpenPhotoPicker}
          onPhotoFilesSelected={onPhotoFilesSelected}
          onPhotoDrop={onPhotoDrop}
          onPhotoDragOver={onPhotoDragOver}
          onPhotoDragLeave={onPhotoDragLeave}
          isPhotoDragOver={isPhotoDragOver}
          onRequestDeletePhoto={onRequestDeletePhoto}
          onPhotoTileDragStart={onPhotoTileDragStart}
          onPhotoTileDragEnd={onPhotoTileDragEnd}
          onPhotoTileDragOver={onPhotoTileDragOver}
          onPhotoTileDragLeave={onPhotoTileDragLeave}
          onPhotoTileDrop={onPhotoTileDrop}
          draggingPhotoId={draggingPhotoId}
          photoDropTargetId={photoDropTargetId}
          saving={saving}
          deletingPhoto={deletingPhoto}
          photoInputRef={photoInputRef}
        />
      );
    case "Amenities":
      return (
        <HostPropertyAmenitiesTab
          amenityCategoryKeys={amenityCategoryKeys}
          amenitiesByCategory={amenitiesByCategory}
          expandedAmenityCategories={expandedAmenityCategories}
          selectedAmenityCountByCategory={selectedAmenityCountByCategory}
          selectedAmenityIdSet={selectedAmenityIdSet}
          toggleAmenityCategory={toggleAmenityCategory}
          toggleAmenitySelection={toggleAmenitySelection}
        />
      );
    case "Pricing":
      return (
        <HostPropertyPricingTab
          pricingForm={pricingForm}
          setPricingForm={setPricingForm}
        />
      );
    case "Policies":
      return (
        <HostPropertyPoliciesTab
          policyRules={policyRules}
          updatePolicyRule={updatePolicyRule}
          handleDeletePropertyClick={handleDeletePropertyClick}
          saving={saving}
        />
      );
    default:
      return <HostPropertyPlaceholderTab selectedTab={selectedTab} />;
  }
}

const hostPropertyOptionShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  title: PropTypes.string,
  status: PropTypes.string,
});

const propertyFormShape = PropTypes.shape({
  title: PropTypes.string,
  subtitle: PropTypes.string,
  description: PropTypes.string,
});

const propertyCapacityShape = PropTypes.shape({
  propertyType: PropTypes.string,
  guests: PropTypes.number,
  bedrooms: PropTypes.number,
  beds: PropTypes.number,
  bathrooms: PropTypes.number,
});

const propertyAddressShape = PropTypes.shape({
  street: PropTypes.string,
  houseNumber: PropTypes.string,
  postalCode: PropTypes.string,
  city: PropTypes.string,
  country: PropTypes.string,
});

const pricingFormShape = PropTypes.shape({
  nightlyRate: PropTypes.number,
  minimumStay: PropTypes.number,
  maximumStay: PropTypes.number,
  weeklyDiscountEnabled: PropTypes.bool,
  weeklyDiscountPercent: PropTypes.number,
  monthlyDiscountEnabled: PropTypes.bool,
  monthlyDiscountPercent: PropTypes.number,
  lastMinuteDiscountEnabled: PropTypes.bool,
  lastMinuteDiscountDays: PropTypes.number,
  lastMinuteDiscountPercent: PropTypes.number,
  earlyBirdDiscountEnabled: PropTypes.bool,
  earlyBirdDiscountDays: PropTypes.number,
  earlyBirdDiscountPercent: PropTypes.number,
});

const amenityShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  amenity: PropTypes.string,
});

const displayedPhotoShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  src: PropTypes.string.isRequired,
  isPending: PropTypes.bool.isRequired,
});

HostPropertyTabs.propTypes = {
  selectedTab: PropTypes.string.isRequired,
  onSelectTab: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
};

HostPropertyListingSummary.propTypes = {
  propertyId: PropTypes.string,
  hostProperties: PropTypes.arrayOf(hostPropertyOptionShape).isRequired,
  title: PropTypes.string,
  statusLabel: PropTypes.string.isRequired,
  statusDotClass: PropTypes.string.isRequired,
  onPropertyChange: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
};

HostPropertyOverviewTab.propTypes = {
  form: propertyFormShape.isRequired,
  updateField: PropTypes.func.isRequired,
  displayedPropertyType: PropTypes.string.isRequired,
  setCapacity: PropTypes.func.isRequired,
  capacity: propertyCapacityShape.isRequired,
  adjustCapacityField: PropTypes.func.isRequired,
  updateCapacityField: PropTypes.func.isRequired,
  address: propertyAddressShape.isRequired,
  updateAddressField: PropTypes.func.isRequired,
};

HostPropertyPhotosTab.propTypes = {
  displayedPhotos: PropTypes.arrayOf(displayedPhotoShape).isRequired,
  pendingPhotoCount: PropTypes.number.isRequired,
  onOpenPhotoPicker: PropTypes.func.isRequired,
  onPhotoFilesSelected: PropTypes.func.isRequired,
  onPhotoDrop: PropTypes.func.isRequired,
  onPhotoDragOver: PropTypes.func.isRequired,
  onPhotoDragLeave: PropTypes.func.isRequired,
  isPhotoDragOver: PropTypes.bool.isRequired,
  onRequestDeletePhoto: PropTypes.func.isRequired,
  onPhotoTileDragStart: PropTypes.func.isRequired,
  onPhotoTileDragEnd: PropTypes.func.isRequired,
  onPhotoTileDragOver: PropTypes.func.isRequired,
  onPhotoTileDragLeave: PropTypes.func.isRequired,
  onPhotoTileDrop: PropTypes.func.isRequired,
  draggingPhotoId: PropTypes.string,
  photoDropTargetId: PropTypes.string,
  saving: PropTypes.bool.isRequired,
  deletingPhoto: PropTypes.bool.isRequired,
  photoInputRef: PropTypes.shape({
    current: PropTypes.any,
  }).isRequired,
};

HostPropertyPhotoDeleteModal.propTypes = {
  open: PropTypes.bool.isRequired,
  photoSrc: PropTypes.string,
  deletingPhoto: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

HostPropertyUnsavedChangesModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onStay: PropTypes.func.isRequired,
  onLeave: PropTypes.func.isRequired,
};

HostPropertyAmenitiesTab.propTypes = {
  amenityCategoryKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
  amenitiesByCategory: PropTypes.objectOf(PropTypes.arrayOf(amenityShape)).isRequired,
  expandedAmenityCategories: PropTypes.objectOf(PropTypes.bool).isRequired,
  selectedAmenityCountByCategory: PropTypes.objectOf(PropTypes.number).isRequired,
  selectedAmenityIdSet: PropTypes.instanceOf(Set).isRequired,
  toggleAmenityCategory: PropTypes.func.isRequired,
  toggleAmenitySelection: PropTypes.func.isRequired,
};

HostPropertyPricingDiscountRow.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  enabled: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  percentValue: PropTypes.number.isRequired,
  percentOptions: PropTypes.arrayOf(PropTypes.number).isRequired,
  onPercentChange: PropTypes.func.isRequired,
  timingLabel: PropTypes.string,
  timingValue: PropTypes.number,
  timingOptions: PropTypes.arrayOf(PropTypes.number),
  onTimingChange: PropTypes.func,
};

HostPropertyPricingDiscountRow.defaultProps = {
  timingLabel: "",
  timingValue: 0,
  timingOptions: [],
  onTimingChange: () => {},
};

HostPropertyPricingTab.propTypes = {
  pricingForm: pricingFormShape.isRequired,
  setPricingForm: PropTypes.func.isRequired,
};

HostPropertyPoliciesTab.propTypes = {
  policyRules: PropTypes.objectOf(PropTypes.bool).isRequired,
  updatePolicyRule: PropTypes.func.isRequired,
  handleDeletePropertyClick: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
};

HostPropertyPlaceholderTab.propTypes = {
  selectedTab: PropTypes.string.isRequired,
};

HostPropertyActions.propTypes = {
  onBack: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
  saveEnabled: PropTypes.bool.isRequired,
};

HostPropertyTabContent.propTypes = {
  selectedTab: PropTypes.string.isRequired,
  form: propertyFormShape.isRequired,
  updateField: PropTypes.func.isRequired,
  displayedPropertyType: PropTypes.string.isRequired,
  setCapacity: PropTypes.func.isRequired,
  capacity: propertyCapacityShape.isRequired,
  adjustCapacityField: PropTypes.func.isRequired,
  updateCapacityField: PropTypes.func.isRequired,
  address: propertyAddressShape.isRequired,
  updateAddressField: PropTypes.func.isRequired,
  displayedPhotos: PropTypes.arrayOf(displayedPhotoShape).isRequired,
  pendingPhotoCount: PropTypes.number.isRequired,
  onOpenPhotoPicker: PropTypes.func.isRequired,
  onPhotoFilesSelected: PropTypes.func.isRequired,
  onPhotoDrop: PropTypes.func.isRequired,
  onPhotoDragOver: PropTypes.func.isRequired,
  onPhotoDragLeave: PropTypes.func.isRequired,
  isPhotoDragOver: PropTypes.bool.isRequired,
  onRequestDeletePhoto: PropTypes.func.isRequired,
  onPhotoTileDragStart: PropTypes.func.isRequired,
  onPhotoTileDragEnd: PropTypes.func.isRequired,
  onPhotoTileDragOver: PropTypes.func.isRequired,
  onPhotoTileDragLeave: PropTypes.func.isRequired,
  onPhotoTileDrop: PropTypes.func.isRequired,
  draggingPhotoId: PropTypes.string,
  photoDropTargetId: PropTypes.string,
  deletingPhoto: PropTypes.bool.isRequired,
  photoInputRef: PropTypes.shape({
    current: PropTypes.any,
  }).isRequired,
  amenityCategoryKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
  amenitiesByCategory: PropTypes.objectOf(PropTypes.arrayOf(amenityShape)).isRequired,
  expandedAmenityCategories: PropTypes.objectOf(PropTypes.bool).isRequired,
  selectedAmenityCountByCategory: PropTypes.objectOf(PropTypes.number).isRequired,
  selectedAmenityIdSet: PropTypes.instanceOf(Set).isRequired,
  toggleAmenityCategory: PropTypes.func.isRequired,
  toggleAmenitySelection: PropTypes.func.isRequired,
  pricingForm: pricingFormShape.isRequired,
  setPricingForm: PropTypes.func.isRequired,
  policyRules: PropTypes.objectOf(PropTypes.bool).isRequired,
  updatePolicyRule: PropTypes.func.isRequired,
  handleDeletePropertyClick: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
};

export default function HostProperty() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const propertyId = params.get("ID");
  const photoInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preparingPhotos, setPreparingPhotos] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("INACTIVE");
  const [selectedTab, setSelectedTab] = useState("Overview");
  const [hostProperties, setHostProperties] = useState([]);
  const [selectedAmenityIds, setSelectedAmenityIds] = useState([]);
  const [policyRules, setPolicyRules] = useState(createInitialPolicyRules);
  const [pricingForm, setPricingForm] = useState(createInitialPricingForm);
  const [expandedAmenityCategories, setExpandedAmenityCategories] = useState({});
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    description: "",
  });
  const [capacity, setCapacity] = useState({
    propertyType: "",
    guests: 0,
    bedrooms: 0,
    beds: 0,
    bathrooms: 0,
  });
  const [address, setAddress] = useState({
    street: "",
    houseNumber: "",
    postalCode: "",
    city: "",
    country: "",
  });
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [isPhotoDragOver, setIsPhotoDragOver] = useState(false);
  const [photoOrderIds, setPhotoOrderIds] = useState([]);
  const [draggingPhotoId, setDraggingPhotoId] = useState(null);
  const [photoDropTargetId, setPhotoDropTargetId] = useState(null);
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [unsavedChangesModalOpen, setUnsavedChangesModalOpen] = useState(false);
  const savedOverviewSnapshotRef = useRef(null);
  const savedAmenityIdsRef = useRef([]);
  const savedPolicyRulesRef = useRef(buildPolicyRulesSnapshot(createInitialPolicyRules()));
  const savedPricingSnapshotRef = useRef(buildPricingSnapshot(createInitialPricingForm()));
  const bypassUnsavedGuardRef = useRef(false);
  const pendingNavigationActionRef = useRef(null);
  const isDevelopment = process.env.NODE_ENV === "development";

  const amenitiesByCategory = useMemo(() => {
    return amenitiesCatalogue.reduce((categories, amenity) => {
      if (!categories[amenity.category]) {
        categories[amenity.category] = [];
      }
      categories[amenity.category].push(amenity);
      return categories;
    }, {});
  }, []);

  const amenityCategoryKeys = useMemo(() => {
    const categorySet = new Set(Object.keys(amenitiesByCategory));
    const ordered = AMENITY_CATEGORY_ORDER.filter((category) => categorySet.has(category));
    const leftovers = Object.keys(amenitiesByCategory)
      .filter((category) => !AMENITY_CATEGORY_ORDER.includes(category))
      .sort((left, right) => left.localeCompare(right));
    return [...ordered, ...leftovers];
  }, [amenitiesByCategory]);

  const selectedAmenityIdSet = useMemo(() => new Set(selectedAmenityIds), [selectedAmenityIds]);
  const displayedPhotos = useMemo(
    () => buildDisplayedPhotos(existingPhotos, pendingPhotos, photoOrderIds),
    [existingPhotos, pendingPhotos, photoOrderIds]
  );
  const existingPhotoIdSet = useMemo(
    () => new Set(existingPhotos.map((photo) => photo.id)),
    [existingPhotos]
  );
  const orderedExistingPhotoIds = useMemo(
    () => photoOrderIds.filter((photoId) => existingPhotoIdSet.has(photoId)),
    [photoOrderIds, existingPhotoIdSet]
  );
  const hasPhotoOrderChanges = useMemo(
    () => existingPhotos.map((photo) => photo.id).join(",") !== orderedExistingPhotoIds.join(","),
    [existingPhotos, orderedExistingPhotoIds]
  );
  const overviewSnapshot = useMemo(
    () => buildOverviewSnapshot(form, capacity, address),
    [form, capacity, address]
  );
  const amenityIdsSnapshot = useMemo(
    () => normalizeAmenityIds(selectedAmenityIds),
    [selectedAmenityIds]
  );
  const policyRulesSnapshot = useMemo(
    () => buildPolicyRulesSnapshot(policyRules),
    [policyRules]
  );
  const pricingSnapshot = useMemo(
    () => buildPricingSnapshot(pricingForm),
    [pricingForm]
  );
  const hasOverviewChanges = savedOverviewSnapshotRef.current
    ? !areSnapshotsEqual(overviewSnapshot, savedOverviewSnapshotRef.current)
    : false;
  const hasAmenitiesChanges = !areStringArraysEqual(amenityIdsSnapshot, savedAmenityIdsRef.current);
  const hasPoliciesChanges = !areSnapshotsEqual(policyRulesSnapshot, savedPolicyRulesRef.current);
  const hasPricingChanges = !areSnapshotsEqual(pricingSnapshot, savedPricingSnapshotRef.current);
  const hasPhotoChanges = pendingPhotos.length > 0 || hasPhotoOrderChanges;
  const hasUnsavedChanges = !loading &&
    (hasOverviewChanges || hasAmenitiesChanges || hasPricingChanges || hasPoliciesChanges || hasPhotoChanges);

  const selectedAmenityCountByCategory = useMemo(() => {
    return amenityCategoryKeys.reduce((counts, category) => {
      const categoryAmenities = amenitiesByCategory[category] || [];
      counts[category] = categoryAmenities.filter((amenity) => selectedAmenityIdSet.has(String(amenity.id))).length;
      return counts;
    }, {});
  }, [amenitiesByCategory, amenityCategoryKeys, selectedAmenityIdSet]);

  useEffect(() => {
    if (amenityCategoryKeys.length === 0) {
      return;
    }
    setExpandedAmenityCategories((previous) => {
      if (Object.keys(previous).length > 0) {
        return previous;
      }
      return { [amenityCategoryKeys[0]]: true };
    });
  }, [amenityCategoryKeys]);

  useEffect(() => {
    if (!propertyId) {
      setError("Missing property ID.");
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchProperty = async () => {
      setLoading(true);
      setError("");
      try {
        const { data, hostPropertiesData } = await fetchPropertyAndListings(propertyId);
        if (!isMounted) {
          return;
        }
        const fetchedPropertyData = extractFetchedPropertyData(data, hostPropertiesData);
        setStatus(fetchedPropertyData.status);
        setForm(fetchedPropertyData.form);
        setCapacity(fetchedPropertyData.capacity);
        setAddress(fetchedPropertyData.address);
        setSelectedAmenityIds(fetchedPropertyData.selectedAmenityIds);
        setPolicyRules(fetchedPropertyData.policyRules);
        setPricingForm(fetchedPropertyData.pricingForm);
        setExistingPhotos(fetchedPropertyData.existingPhotos);
        setPendingPhotos([]);
        setIsPhotoDragOver(false);
        setPhotoOrderIds(fetchedPropertyData.existingPhotos.map((photo) => photo.id));
        setDraggingPhotoId(null);
        setPhotoDropTargetId(null);
        setPhotoToDelete(null);
        setDeletingPhoto(false);
        setHostProperties(fetchedPropertyData.hostProperties);
        savedOverviewSnapshotRef.current = buildOverviewSnapshot(
          fetchedPropertyData.form,
          fetchedPropertyData.capacity,
          fetchedPropertyData.address
        );
        savedAmenityIdsRef.current = normalizeAmenityIds(fetchedPropertyData.selectedAmenityIds);
        savedPolicyRulesRef.current = buildPolicyRulesSnapshot(fetchedPropertyData.policyRules);
        savedPricingSnapshotRef.current = buildPricingSnapshot(fetchedPropertyData.pricingForm);
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError("Could not load property details.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProperty();
    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };
  const updateAddressField = (field, value) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  };

  const updateCapacityField = (field, value) => {
    setCapacity((prev) => ({ ...prev, [field]: normalizeCapacityValue(value) }));
  };

  const adjustCapacityField = (field, delta) => {
    setCapacity((prev) => ({ ...prev, [field]: normalizeCapacityValue(prev[field] + delta) }));
  };

  const openPhotoPicker = () => {
    if (!photoInputRef.current) {
      return;
    }
    photoInputRef.current.value = "";
    photoInputRef.current.click();
  };

  const addPhotosToQueue = async (files) => {
    const incomingFiles = Array.from(files || []);
    if (incomingFiles.length === 0) {
      return;
    }

    const availableSlots = MAX_PROPERTY_IMAGES - (existingPhotos.length + pendingPhotos.length);
    if (availableSlots <= 0) {
      toast.error(`A listing can have up to ${MAX_PROPERTY_IMAGES} photos.`);
      return;
    }

    const acceptedFiles = incomingFiles.slice(0, availableSlots);
    setPreparingPhotos(true);
    try {
      const preparedPhotos = [];
      let totalPendingBytes = pendingPhotos.reduce((total, photo) => total + Number(photo?.size || 0), 0);
      for (const file of acceptedFiles) {
        if (totalPendingBytes + file.size > MAX_TOTAL_PENDING_PHOTO_BYTES) {
          toast.error("Total upload size is too large.");
          continue;
        }
        try {
          const pendingPhoto = await createPendingPhotoFromFile(file);
          preparedPhotos.push(pendingPhoto);
          totalPendingBytes += pendingPhoto.size;
        } catch (error) {
          toast.error(error?.message || "Photo could not be added.");
        }
      }

      if (preparedPhotos.length > 0) {
        setPendingPhotos((previous) => [...previous, ...preparedPhotos]);
        setPhotoOrderIds((previous) => [...previous, ...preparedPhotos.map((photo) => photo.id)]);
        const pluralSuffix = preparedPhotos.length === 1 ? "" : "s";
        toast.success(`${preparedPhotos.length} new photo${pluralSuffix} ready to upload.`);
      }

      if (incomingFiles.length > acceptedFiles.length) {
        toast.error(`Only ${MAX_PROPERTY_IMAGES} photos are allowed per listing.`);
      }
    } finally {
      setPreparingPhotos(false);
    }
  };

  const handlePhotoInputChange = async (event) => {
    await addPhotosToQueue(event.target.files);
  };

  const handlePhotoAddDragOver = (event) => {
    event.preventDefault();
    if (draggingPhotoId) {
      setPhotoDropTargetId(null);
      setIsPhotoDragOver(false);
      return;
    }
    const dragTypes = Array.from(event.dataTransfer?.types || []);
    if (dragTypes.includes("Files")) {
      setIsPhotoDragOver(true);
    }
  };

  const handlePhotoAddDragLeave = () => {
    setIsPhotoDragOver(false);
  };

  const handlePhotoDrop = async (event) => {
    event.preventDefault();
    setIsPhotoDragOver(false);
    if (draggingPhotoId) {
      return;
    }
    const droppedFiles = event.dataTransfer?.files;
    if (!droppedFiles || droppedFiles.length === 0) {
      return;
    }
    await addPhotosToQueue(droppedFiles);
  };

  const removePendingPhoto = (photoId) => {
    setPendingPhotos((previous) => previous.filter((photo) => photo.id !== photoId));
    setPhotoOrderIds((previous) => previous.filter((id) => id !== photoId));
  };

  const handleRequestDeletePhoto = (photo) => {
    if (!photo || saving || deletingPhoto) {
      return;
    }
    if (photo.isPending) {
      removePendingPhoto(photo.id);
      toast.success("Photo removed.");
      return;
    }
    setPhotoToDelete(photo);
  };

  const closePhotoDeleteModal = () => {
    if (deletingPhoto) {
      return;
    }
    setPhotoToDelete(null);
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete || !propertyId) {
      return;
    }

    setDeletingPhoto(true);
    setError("");
    try {
      if (photoToDelete.isPending) {
        removePendingPhoto(photoToDelete.id);
        toast.success("Photo removed.");
      } else {
        const refreshedPhotos = await deletePropertyPhoto({
          propertyId,
          imageId: photoToDelete.id,
        });
        setExistingPhotos(refreshedPhotos);
        setPhotoOrderIds(refreshedPhotos.map((photo) => photo.id));
        toast.success("Photo deleted successfully.");
      }
      setPhotoToDelete(null);
    } catch (deleteError) {
      console.error(deleteError);
      const deleteErrorMessage = resolveDeletePhotoErrorMessage(deleteError, isDevelopment);
      setError(deleteErrorMessage);
      toast.error(deleteErrorMessage);
    } finally {
      setDeletingPhoto(false);
    }
  };

  const handlePhotoTileDragStart = (photoId) => {
    setDraggingPhotoId(photoId);
  };

  const handlePhotoTileDragEnd = () => {
    setDraggingPhotoId(null);
    setPhotoDropTargetId(null);
  };

  const handlePhotoTileDragOver = (targetPhotoId) => {
    if (!draggingPhotoId || draggingPhotoId === targetPhotoId) {
      setPhotoDropTargetId(null);
      return;
    }
    setPhotoDropTargetId(targetPhotoId);
  };

  const handlePhotoTileDragLeave = (targetPhotoId) => {
    setPhotoDropTargetId((previous) => (previous === targetPhotoId ? null : previous));
  };

  const handlePhotoTileDrop = (targetPhotoId) => {
    if (!draggingPhotoId || draggingPhotoId === targetPhotoId) {
      return;
    }
    setPhotoOrderIds((previous) => {
      const fromIndex = previous.indexOf(draggingPhotoId);
      const toIndex = previous.indexOf(targetPhotoId);
      if (fromIndex === -1 || toIndex === -1) {
        return previous;
      }
      const reordered = [...previous];
      reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, draggingPhotoId);
      return reordered;
    });
    setDraggingPhotoId(null);
    setPhotoDropTargetId(null);
  };

  const saveOverview = async () => {
    if (saving || preparingPhotos) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (selectedTab === "Photos") {
        const photoSaveResult = await savePropertyPhotos({
          propertyId,
          existingPhotos,
          pendingPhotos,
          photoOrderIds,
          hasPhotoOrderChanges,
        });
        setExistingPhotos(photoSaveResult.nextExistingPhotos);
        setPendingPhotos(photoSaveResult.nextPendingPhotos);
        setPhotoOrderIds(photoSaveResult.nextPhotoOrderIds);
        if (photoSaveResult.didUpload) {
          toast.success(photoSaveResult.successMessage);
        } else if (photoSaveResult.didReorder) {
          toast.success(photoSaveResult.successMessage);
        } else {
          toast.info(photoSaveResult.successMessage);
        }
        return;
      }

      const { normalizedForm, normalizedPricingForm, successMessage } = await savePropertyChanges({
        selectedTab,
        propertyId,
        form,
        capacity,
        address,
        selectedAmenityIds,
        policyRules,
        pricingForm,
      });
      setForm(normalizedForm);
      setPricingForm(normalizedPricingForm);
      setHostProperties((previous) =>
        previous.map((accommodation) =>
          accommodation.id === propertyId
            ? { ...accommodation, title: normalizedForm.title || "Untitled listing" }
            : accommodation
        )
      );
      savedOverviewSnapshotRef.current = buildOverviewSnapshot(normalizedForm, capacity, address);
      if (selectedTab === "Amenities") {
        savedAmenityIdsRef.current = normalizeAmenityIds(selectedAmenityIds);
      }
      if (selectedTab === "Pricing") {
        savedPricingSnapshotRef.current = buildPricingSnapshot(normalizedPricingForm);
      }
      if (selectedTab === "Policies") {
        savedPolicyRulesRef.current = buildPolicyRulesSnapshot(policyRules);
      }
      toast.success(successMessage);
    } catch (err) {
      console.error(err);
      const resolvedErrorMessage = resolveSaveErrorMessage(err, isDevelopment);
      setError(resolvedErrorMessage);
      toast.error(resolvedErrorMessage);
    } finally {
      setSaving(false);
    }
  };

  const isBusy = saving || preparingPhotos;
  const shouldBlockNavigation = hasUnsavedChanges && !isBusy && !deletingPhoto;

  const requestNavigation = useCallback((navigationAction) => {
    if (bypassUnsavedGuardRef.current || !shouldBlockNavigation) {
      navigationAction();
      return;
    }
    pendingNavigationActionRef.current = navigationAction;
    setUnsavedChangesModalOpen(true);
  }, [shouldBlockNavigation]);

  const stayOnUnsavedChanges = () => {
    pendingNavigationActionRef.current = null;
    setUnsavedChangesModalOpen(false);
  };

  const leaveWithUnsavedChanges = () => {
    const navigationAction = pendingNavigationActionRef.current;
    pendingNavigationActionRef.current = null;
    setUnsavedChangesModalOpen(false);
    if (!navigationAction) {
      return;
    }
    bypassUnsavedGuardRef.current = true;
    navigationAction();
    setTimeout(() => {
      bypassUnsavedGuardRef.current = false;
    }, 0);
  };

  useEffect(() => {
    if (!shouldBlockNavigation) {
      return undefined;
    }

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    globalThis.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      globalThis.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [shouldBlockNavigation]);

  useEffect(() => {
    if (!shouldBlockNavigation) {
      return undefined;
    }

    const handleDocumentNavigationClick = (event) => {
      if (bypassUnsavedGuardRef.current) {
        return;
      }
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const eventTarget = event.target;
      if (!(eventTarget instanceof Element)) {
        return;
      }

      const anchor = eventTarget.closest("a[href]");
      if (!anchor) {
        return;
      }
      if (anchor.target && anchor.target !== "_self") {
        return;
      }
      if (anchor.hasAttribute("download")) {
        return;
      }

      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#")) {
        return;
      }

      const nextUrl = new URL(anchor.href, globalThis.location.href);
      const currentUrl = new URL(globalThis.location.href);
      if (nextUrl.origin !== currentUrl.origin) {
        return;
      }

      const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
      const currentPath = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
      if (nextPath === currentPath) {
        return;
      }

      event.preventDefault();
      requestNavigation(navigate.bind(null, nextPath));
    };

    document.addEventListener("click", handleDocumentNavigationClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentNavigationClick, true);
    };
  }, [navigate, requestNavigation, shouldBlockNavigation]);

  useEffect(() => {
    if (!shouldBlockNavigation && unsavedChangesModalOpen) {
      pendingNavigationActionRef.current = null;
      setUnsavedChangesModalOpen(false);
    }
  }, [shouldBlockNavigation, unsavedChangesModalOpen]);

  if (loading) {
    return <HostPropertyLoadingView />;
  }

  const statusLabel = status === "ACTIVE" ? "Live" : "Draft";
  const statusDotClass = status === "ACTIVE" ? styles.statusDotLive : styles.statusDotDraft;
  const displayedPropertyType = capacity.propertyType || "Entire house";
  const savingMessage = SAVING_MESSAGE_BY_TAB[selectedTab] || "Saving property details...";
  const overlayMessage = saving ? savingMessage : "Preparing photos...";

  const handlePropertyChange = (event) => {
    const nextPropertyId = event.target.value;
    if (!nextPropertyId || nextPropertyId === propertyId) {
      return;
    }
    requestNavigation(navigate.bind(null, `/hostdashboard/property?ID=${encodeURIComponent(nextPropertyId)}`));
  };

  const toggleAmenityCategory = (category) => {
    setExpandedAmenityCategories((previous) => ({
      ...previous,
      [category]: !previous[category],
    }));
  };

  const toggleAmenitySelection = (amenityId) => {
    const normalizedAmenityId = String(amenityId);
    setSelectedAmenityIds((previous) =>
      previous.includes(normalizedAmenityId)
        ? previous.filter((id) => id !== normalizedAmenityId)
        : [...previous, normalizedAmenityId]
    );
  };

  const updatePolicyRule = (ruleName, value) => {
    setPolicyRules((previous) => ({
      ...previous,
      [ruleName]: value,
    }));
  };

  const handleDeletePropertyClick = () => {
    toast.info("Delete property flow will be enabled in the dedicated delete release.");
  };

  const canSaveChanges = selectedTab === "Photos"
    ? pendingPhotos.length > 0 || hasPhotoOrderChanges
    : SAVE_ENABLED_TABS.has(selectedTab);
  const handleBackToListings = () => requestNavigation(navigate.bind(null, "/hostdashboard/listings"));

  return (
    <main className="page-Host">
      <p className="page-Host-title">Listing editor</p>
      <div className="page-Host-content">
        <section className={`host-pc-dashboard ${styles.editorShell}`}>
          {isBusy ? (
            <output className={styles.savingOverlay} aria-live="polite">
              <span className={styles.savingOverlayContent}>
                <ClipLoader size={80} color="#0D9813" loading />
                <span className={styles.savingOverlayText}>{overlayMessage}</span>
              </span>
            </output>
          ) : null}

          <HostPropertyTabs selectedTab={selectedTab} onSelectTab={setSelectedTab} saving={isBusy} />
          <HostPropertyListingSummary
            propertyId={propertyId}
            hostProperties={hostProperties}
            title={form.title}
            statusLabel={statusLabel}
            statusDotClass={statusDotClass}
            onPropertyChange={handlePropertyChange}
            saving={isBusy}
          />

          <HostPropertyTabContent
            selectedTab={selectedTab}
            form={form}
            updateField={updateField}
            displayedPropertyType={displayedPropertyType}
            setCapacity={setCapacity}
            capacity={capacity}
            adjustCapacityField={adjustCapacityField}
            updateCapacityField={updateCapacityField}
            address={address}
            updateAddressField={updateAddressField}
            displayedPhotos={displayedPhotos}
            pendingPhotoCount={pendingPhotos.length}
            onOpenPhotoPicker={openPhotoPicker}
            onPhotoFilesSelected={handlePhotoInputChange}
            onPhotoDrop={handlePhotoDrop}
            onPhotoDragOver={handlePhotoAddDragOver}
            onPhotoDragLeave={handlePhotoAddDragLeave}
            isPhotoDragOver={isPhotoDragOver}
            onRequestDeletePhoto={handleRequestDeletePhoto}
            onPhotoTileDragStart={handlePhotoTileDragStart}
            onPhotoTileDragEnd={handlePhotoTileDragEnd}
            onPhotoTileDragOver={handlePhotoTileDragOver}
            onPhotoTileDragLeave={handlePhotoTileDragLeave}
            onPhotoTileDrop={handlePhotoTileDrop}
            draggingPhotoId={draggingPhotoId}
            photoDropTargetId={photoDropTargetId}
            deletingPhoto={deletingPhoto}
            photoInputRef={photoInputRef}
            amenityCategoryKeys={amenityCategoryKeys}
            amenitiesByCategory={amenitiesByCategory}
            expandedAmenityCategories={expandedAmenityCategories}
            selectedAmenityCountByCategory={selectedAmenityCountByCategory}
            selectedAmenityIdSet={selectedAmenityIdSet}
            toggleAmenityCategory={toggleAmenityCategory}
            toggleAmenitySelection={toggleAmenitySelection}
            pricingForm={pricingForm}
            setPricingForm={setPricingForm}
            policyRules={policyRules}
            updatePolicyRule={updatePolicyRule}
            handleDeletePropertyClick={handleDeletePropertyClick}
            saving={isBusy}
          />
          <HostPropertyPhotoDeleteModal
            open={Boolean(photoToDelete)}
            photoSrc={photoToDelete?.src || ""}
            deletingPhoto={deletingPhoto}
            onCancel={closePhotoDeleteModal}
            onConfirm={confirmDeletePhoto}
          />
          <HostPropertyUnsavedChangesModal
            open={unsavedChangesModalOpen}
            onStay={stayOnUnsavedChanges}
            onLeave={leaveWithUnsavedChanges}
          />
          {error ? <p className={styles.errorText}>{error}</p> : null}

          <HostPropertyActions
            onBack={handleBackToListings}
            onSave={saveOverview}
            saving={isBusy}
            saveEnabled={canSaveChanges}
          />
        </section>
      </div>
    </main>
  );
}
