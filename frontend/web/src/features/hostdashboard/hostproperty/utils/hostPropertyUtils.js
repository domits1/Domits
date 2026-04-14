import { normalizeImageUrl } from "../../../guestdashboard/utils/image";
import {
  MAX_CAPACITY_VALUE,
  MAX_PHOTO_BYTES,
  MIN_PHOTO_HEIGHT,
  MIN_PHOTO_WIDTH,
  PHOTO_ALLOWED_TYPES,
  POLICY_RULE_CONFIG,
  PRICING_MAX_NIGHTLY_RATE,
  PRICING_MIN_NIGHTLY_RATE_FOR_INPUT,
  PRICING_RESTRICTION_KEYS,
  SAVE_SUCCESS_MESSAGE_BY_TAB,
  createInitialPolicyRules,
  createInitialPricingForm,
} from "../constants";

const POLICY_ADVANCE_NOTICE_RESTRICTION_KEYS = [
  "MinimumAdvanceReservation",
  "MinimumAdvanceNoticeDays",
  "MinimumAdvanceBookingDays",
];
const DEFAULT_POLICY_ADVANCE_NOTICE_RESTRICTION_KEY = "MinimumAdvanceReservation";
const POLICY_PREPARATION_TIME_RESTRICTION_KEYS = [
  "PreparationTimeDays",
  "PreparationDays",
  "TurnoverDays",
];
const DEFAULT_POLICY_PREPARATION_TIME_RESTRICTION_KEY = "PreparationTimeDays";

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

export const normalizePricingForm = (pricingForm) => {
  const defaultPricingForm = createInitialPricingForm();
  const nightlyRate = clampInteger(
    pricingForm?.nightlyRate,
    defaultPricingForm.nightlyRate,
    PRICING_MIN_NIGHTLY_RATE_FOR_INPUT,
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

export const buildPricingSnapshot = (pricingForm) => normalizePricingForm(pricingForm);

export const buildPricingRestrictionsPayload = (pricingForm) => {
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

export const buildAvailabilityRestrictionValueMap = (availabilityRestrictions) =>
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

const buildRuleValueMap = (rules) =>
  new Map(
    (Array.isArray(rules) ? rules : [])
      .map((entry) => {
        const rule = String(entry?.rule || "").trim();
        if (!rule) {
          return null;
        }
        return [rule, entry?.value];
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

export const mapPropertyPricingToState = (pricing, availabilityRestrictions) => {
  const restrictionValueMap = buildAvailabilityRestrictionValueMap(availabilityRestrictions);
  const defaultPricingForm = createInitialPricingForm();
  const nightlyRateRaw = Number(pricing?.roomRate ?? pricing?.roomrate);
  const nightlyRate = Number.isFinite(nightlyRateRaw)
    ? clampInteger(
      nightlyRateRaw,
      defaultPricingForm.nightlyRate,
      PRICING_MIN_NIGHTLY_RATE_FOR_INPUT,
      PRICING_MAX_NIGHTLY_RATE
    )
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

export const getSelectOptionsWithCurrent = (options, currentValue) => {
  const normalizedCurrentValue = Number(currentValue);
  if (!Number.isFinite(normalizedCurrentValue)) {
    return [...options];
  }
  if (options.includes(normalizedCurrentValue)) {
    return [...options];
  }
  return [...options, normalizedCurrentValue].sort((left, right) => left - right);
};

export const getStayOptionLabel = (value) => {
  if (value === 0) {
    return "No maximum";
  }
  return `${value} night${value === 1 ? "" : "s"}`;
};

export const normalizeCapacityValue = (value) => {
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

export const getLocationPayload = (address) => {
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

export const getApiErrorMessage = async (response, fallbackMessage) => {
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

export const mapPropertyImagesToState = (images) => {
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

export const buildDisplayedPhotos = (existingPhotos, pendingPhotos, photoOrderIds) => {
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

export const normalizeAmenityIds = (amenityIds) =>
  Array.from(
    new Set(
      (Array.isArray(amenityIds) ? amenityIds : [])
        .map((amenityId) => String(amenityId).trim())
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right));

export const buildPolicyRulesSnapshot = (policyRules) =>
  POLICY_RULE_CONFIG.reduce((snapshot, ruleConfig) => {
    snapshot[ruleConfig.rule] = Boolean(policyRules?.[ruleConfig.rule]);
    return snapshot;
  }, {});

const normalizeTimeString = (value, fallback) => {
  const trimmedValue = String(value || "").trim();
  if (!trimmedValue) {
    return fallback;
  }
  const timeMatch = /^(\d{2}:\d{2})(:\d{2})?$/.exec(trimmedValue);
  return timeMatch ? timeMatch[1] : trimmedValue;
};

export const normalizeCheckInDetails = (checkInDetails) => {
  const checkInFrom = normalizeTimeString(checkInDetails?.checkIn?.from, "15:00");
  const checkInTill = normalizeTimeString(checkInDetails?.checkIn?.till, checkInFrom);
  const checkOutFrom = normalizeTimeString(checkInDetails?.checkOut?.from, "11:00");
  const checkOutTill = normalizeTimeString(checkInDetails?.checkOut?.till, checkOutFrom);

  return {
    checkIn: {
      from: checkInFrom,
      till: checkInTill,
    },
    checkOut: {
      from: checkOutFrom,
      till: checkOutTill,
    },
  };
};

export const normalizePolicyAvailabilitySettings = (settings) => ({
  advanceNoticeDays: clampInteger(settings?.advanceNoticeDays, 0, 0, 365),
  preparationTimeDays: clampInteger(settings?.preparationTimeDays, 0, 0, 30),
  advanceNoticeRestrictionKey:
    String(settings?.advanceNoticeRestrictionKey || "").trim() ||
    DEFAULT_POLICY_ADVANCE_NOTICE_RESTRICTION_KEY,
  preparationTimeRestrictionKey:
    String(settings?.preparationTimeRestrictionKey || "").trim() ||
    DEFAULT_POLICY_PREPARATION_TIME_RESTRICTION_KEY,
});

export const buildPolicyEditorSnapshot = (policyRules, checkInDetails, policyAvailabilitySettings) => ({
  rules: buildPolicyRulesSnapshot(policyRules),
  checkIn: normalizeCheckInDetails(checkInDetails),
  availability: normalizePolicyAvailabilitySettings(policyAvailabilitySettings),
});

export const buildPolicyAvailabilityRestrictionsPayload = (policyAvailabilitySettings) => {
  const normalizedSettings = normalizePolicyAvailabilitySettings(policyAvailabilitySettings);
  return [
    {
      restriction: normalizedSettings.advanceNoticeRestrictionKey,
      value: normalizedSettings.advanceNoticeDays,
    },
    {
      restriction: normalizedSettings.preparationTimeRestrictionKey,
      value: normalizedSettings.preparationTimeDays,
    },
  ];
};

export const buildOverviewSnapshot = (form, capacity, address) => ({
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

export const areStringArraysEqual = (left, right) => {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
};

export const areSnapshotsEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read photo file."));
        return;
      }
      resolve(reader.result);
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

let pendingPhotoIdFallbackCounter = 0;

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

export const createPendingPhotoFromFile = async (file) => {
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

export const extractFetchedPropertyData = (data, hostPropertiesData) => {
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
  const restrictionValueMap = buildAvailabilityRestrictionValueMap(availabilityRestrictions);
  const ruleValueMap = buildRuleValueMap(propertyRules);
  const checkInDetailsFromRules = {
    checkIn: {
      from: ruleValueMap.get("CheckInFrom"),
      till: ruleValueMap.get("CheckInTill"),
    },
    checkOut: {
      from: ruleValueMap.get("CheckOutFrom"),
      till: ruleValueMap.get("CheckOutTill"),
    },
  };
  const checkInDetails = data?.checkIn && typeof data.checkIn === "object"
    ? data.checkIn
    : checkInDetailsFromRules;
  const policyAvailabilitySettings = {
    advanceNoticeDays: Math.max(
      0,
      ...POLICY_ADVANCE_NOTICE_RESTRICTION_KEYS
        .filter((restrictionKey) => restrictionValueMap.has(restrictionKey))
        .map((restrictionKey) => Number(restrictionValueMap.get(restrictionKey)) || 0),
      restrictionValueMap.has(DEFAULT_POLICY_ADVANCE_NOTICE_RESTRICTION_KEY)
        ? Number(restrictionValueMap.get(DEFAULT_POLICY_ADVANCE_NOTICE_RESTRICTION_KEY)) || 0
        : 0
    ),
    preparationTimeDays: Math.max(
      0,
      ...POLICY_PREPARATION_TIME_RESTRICTION_KEYS
        .filter((restrictionKey) => restrictionValueMap.has(restrictionKey))
        .map((restrictionKey) => Number(restrictionValueMap.get(restrictionKey)) || 0),
      restrictionValueMap.has(DEFAULT_POLICY_PREPARATION_TIME_RESTRICTION_KEY)
        ? Number(restrictionValueMap.get(DEFAULT_POLICY_PREPARATION_TIME_RESTRICTION_KEY)) || 0
        : 0
    ),
    advanceNoticeRestrictionKey:
      POLICY_ADVANCE_NOTICE_RESTRICTION_KEYS.find((restrictionKey) => restrictionValueMap.has(restrictionKey)) ||
      DEFAULT_POLICY_ADVANCE_NOTICE_RESTRICTION_KEY,
    preparationTimeRestrictionKey:
      POLICY_PREPARATION_TIME_RESTRICTION_KEYS.find((restrictionKey) => restrictionValueMap.has(restrictionKey)) ||
      DEFAULT_POLICY_PREPARATION_TIME_RESTRICTION_KEY,
  };

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
    checkInDetails: normalizeCheckInDetails(checkInDetails),
    policyAvailabilitySettings: normalizePolicyAvailabilitySettings(policyAvailabilitySettings),
    pricingForm: mapPropertyPricingToState(propertyPricing, availabilityRestrictions),
    existingPhotos: mapPropertyImagesToState(propertyImages),
    hostProperties: mapHostProperties(hostPropertiesData, property),
  };
};

export const getSaveSuccessMessage = (selectedTab) => SAVE_SUCCESS_MESSAGE_BY_TAB[selectedTab] || "Property updated successfully.";

export const resolveSaveErrorMessage = (error, isDevelopment) => {
  if (error?.name === "TypeError") {
    if (isDevelopment) {
      return "Could not reach the API. Check AWS deployment/CORS configuration and try again.";
    }
    return "Something went wrong while saving. Please try again later.";
  }
  return error?.message || "Saving failed. Please try again.";
};

export const resolveDeletePhotoErrorMessage = (error, isDevelopment) => {
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

export const normalizePhotoSaveInput = ({ existingPhotos, pendingPhotos, photoOrderIds }) => {
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

export const buildNoPhotoChangesResult = ({ existingPhotos, pendingPhotos, photoOrderIds }) => ({
  nextExistingPhotos: existingPhotos,
  nextPendingPhotos: pendingPhotos,
  nextPhotoOrderIds: photoOrderIds,
  successMessage: "No photo changes to save.",
  didUpload: false,
  didReorder: false,
});

export const buildFinalPersistedPhotoOrder = ({
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

export const getPhotoSaveSuccessMessage = (uploadedPhotoCount) => {
  if (uploadedPhotoCount > 0) {
    return `${uploadedPhotoCount} photo${uploadedPhotoCount === 1 ? "" : "s"} uploaded successfully.`;
  }
  return "Photo order updated successfully.";
};

export const animatePhotoTileToNewPosition = (node, deltaX, deltaY) => {
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

export const createInitialTouchReorderState = () => ({
  pointerId: null,
  sourcePhotoId: null,
  targetPhotoId: null,
  started: false,
  startX: 0,
  startY: 0,
  timerId: null,
});