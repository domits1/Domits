import { getAccessToken } from "../../../../services/getAccessToken";
import {
  MAX_PROPERTY_IMAGES,
  POLICY_RULE_CONFIG,
  PRICING_MIN_NIGHTLY_RATE_FOR_SAVE,
  PROPERTY_API_BASE,
} from "../constants";
import {
  buildAvailabilityRestrictionValueMap,
  buildFinalPersistedPhotoOrder,
  buildNoPhotoChangesResult,
  buildPricingRestrictionsPayload,
  getApiErrorMessage,
  getLocationPayload,
  getPhotoSaveSuccessMessage,
  getSaveSuccessMessage,
  mapPropertyImagesToState,
  normalizePhotoSaveInput,
  normalizeCapacityValue,
  normalizePricingForm,
} from "../utils/hostPropertyUtils";

const CONFIRM_BATCH_SIZE = 8;

export const fetchPropertyAndListings = async (propertyId) => {
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
  const persistedRules = Array.isArray(verificationData?.rules) ? verificationData.rules : [];

  if (persistedRules.length > 0) {
    const persistedRulesMap = new Map(
      persistedRules
        .map((rule) => [String(rule?.rule || ""), Boolean(rule?.value)])
        .filter(([ruleName]) => Boolean(ruleName))
    );
    const hasSomeMatch = (rulesPayload || []).some((rule) => persistedRulesMap.has(rule.rule));
    if (!hasSomeMatch) {
      throw new Error("Policies could not be updated in the deployed backend yet.");
    }
  }
};

const verifyPricing = async (propertyId, pricingPayload, availabilityRestrictionsPayload) => {
  const verificationData = await fetchPropertySnapshot(propertyId);
  const persistedRoomRate = Number(verificationData?.pricing?.roomRate ?? verificationData?.pricing?.roomrate);
  const expectedRoomRate = Number(pricingPayload?.roomRate);
  const hasSameRoomRate =
    Number.isFinite(persistedRoomRate) && Number.isFinite(expectedRoomRate)
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

export const savePropertyChanges = async ({
  selectedTab,
  propertyId,
  form,
  capacity,
  address,
  selectedAmenityIds,
  policyRules,
  pricingForm,
  checkinTime,
  checkoutTime,
  houseRules,
  cancellationPolicy,
  lateCheckin,
  propertyRules,
  safetyRules,
  customPropertyRules,
  customSafetyRules,
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
  if (isSavingPricing && normalizedPricingForm.nightlyRate < PRICING_MIN_NIGHTLY_RATE_FOR_SAVE) {
    throw new Error(`Nightly rate must be at least EUR ${PRICING_MIN_NIGHTLY_RATE_FOR_SAVE}.`);
  }
  const pricingPayload = isSavingPricing ? { roomRate: normalizedPricingForm.nightlyRate } : undefined;
  const availabilityRestrictionsPayload = buildPricingRestrictionsPayload(normalizedPricingForm);
  const amenitiesPayload = isSavingAmenities ? selectedAmenityIds.map(String) : undefined;
  const rulesPayload = (() => {
    if (!isSavingPolicies) return undefined;

    const fromPolicyConfig = POLICY_RULE_CONFIG.map((ruleConfig) => ({
      rule: ruleConfig.rule,
      value: Boolean(policyRules?.[ruleConfig.rule]),
    }));

    const houseToRule = {
      childrenAllowed: "SuitableForChildren",
      smokingAllowed: "SmokingAllowed",
      petsAllowed: "PetsAllowed",
      partiesAllowed: "Parties/EventsAllowed",
    };

    const propertyToRule = {
      cookingAllowed: "CookingAllowed",
      parkingAvailable: "ParkingAvailable",
    };

    const safetyToRule = {
      smokeDetector: "SmokeDetector",
      carbonMonoxide: "CarbonMonoxide",
      fireExtinguisher: "FireExtinguisher",
      firstAidKit: "FirstAidKit",
    };

    const fromHouse = Object.entries(houseToRule).map(([key, rule]) => ({
      rule,
      value: Boolean(houseRules?.[key]),
    }));

    const fromProperty = Object.entries(propertyToRule).map(([key, rule]) => ({
      rule,
      value: Boolean(propertyRules?.[key]),
    }));

    const fromSafety = Object.entries(safetyToRule).map(([key, rule]) => ({
      rule,
      value: Boolean(safetyRules?.[key]),
    }));

    return [...fromPolicyConfig, ...fromHouse, ...fromProperty, ...fromSafety];
  })();

  const checkInPayload =
    isSavingPolicies && (checkinTime || checkoutTime)
      ? {
          checkIn: { from: `${checkinTime || "15:00"}:00`, till: "18:00:00" },
          checkOut: { from: `${checkoutTime || "11:00"}:00`, till: "08:00:00" },
        }
      : undefined;

  const combinedCustomRules = [];
  if (Array.isArray(customPropertyRules)) {
    combinedCustomRules.push(
      ...customPropertyRules.map((r) => ({
        category: "property",
        rule_text: r.rule_text || r.text || r.label || "",
        enabled: r.enabled !== false,
      }))
    );
  }
  if (Array.isArray(customSafetyRules)) {
    combinedCustomRules.push(
      ...customSafetyRules.map((r) => ({
        category: "safety",
        rule_text: r.rule_text || r.text || r.label || "",
        enabled: r.enabled !== false,
      }))
    );
  }

  const requestBody = {
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
    pricing: pricingPayload,
    availabilityRestrictions: availabilityRestrictionsPayload,
    ...(checkInPayload && { checkIn: checkInPayload.checkIn, checkOut: checkInPayload.checkOut }),
    ...(isSavingPolicies && Array.isArray(rulesPayload) && { rules: rulesPayload }),
    ...(isSavingPolicies && cancellationPolicy && { cancellationPolicy }),
    ...(isSavingPolicies && lateCheckin && { lateCheckin }),
    ...(isSavingPolicies && combinedCustomRules.length > 0 && { customRules: combinedCustomRules }),
  };

  const response = await fetch(`${PROPERTY_API_BASE}/overview`, {
    method: "PATCH",
    headers: {
      Authorization: getAccessToken(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const apiErrorMessage = await getApiErrorMessage(response, "Failed to save property overview.");
    throw new Error(apiErrorMessage);
  }

  if (response.status !== 204) {
    await response.json().catch(() => null);
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

const confirmPendingPhotoUploads = async ({ propertyId, uploads, orderedPendingPhotos, pendingOrderPosition }) => {
  for (let startIndex = 0; startIndex < uploads.length; startIndex += CONFIRM_BATCH_SIZE) {
    const uploadBatch = uploads.slice(startIndex, startIndex + CONFIRM_BATCH_SIZE);
    const confirmResponse = await fetch(`${PROPERTY_API_BASE}/images/confirm`, {
      method: "POST",
      headers: {
        Authorization: getAccessToken(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        propertyId,
        images: uploadBatch.map((upload, batchIndex) => {
          const globalIndex = startIndex + batchIndex;
          return {
            imageId: upload.imageId,
            originalKey: upload.key,
            sortOrder: pendingOrderPosition.get(orderedPendingPhotos[globalIndex].id) ?? globalIndex,
          };
        }),
      }),
    });

    if (!confirmResponse.ok) {
      const message = await getApiErrorMessage(confirmResponse, "Failed to finalize photo upload.");
      throw new Error(message);
    }
  }
};

const uploadPendingPropertyPhotos = async ({ propertyId, orderedPendingPhotos, pendingOrderPosition }) => {
  const uploads = await requestPhotoUploadSlots({ propertyId, orderedPendingPhotos });
  await uploadPendingPhotosToStorage({ uploads, orderedPendingPhotos });
  await confirmPendingPhotoUploads({
    propertyId,
    uploads,
    orderedPendingPhotos,
    pendingOrderPosition,
  });
  return new Map(orderedPendingPhotos.map((photo, index) => [photo.id, String(uploads[index]?.imageId || "")]));
};

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

export const savePropertyPhotos = async ({
  propertyId,
  existingPhotos,
  pendingPhotos,
  photoOrderIds,
  hasPhotoOrderChanges,
}) => {
  const { persistedPhotos, queuedPhotos, existingById, normalizedOrderIds, orderedPendingPhotos } =
    normalizePhotoSaveInput({
      existingPhotos,
      pendingPhotos,
      photoOrderIds,
    });

  if (persistedPhotos.length + queuedPhotos.length > MAX_PROPERTY_IMAGES) {
    throw new Error(`A listing can have up to ${MAX_PROPERTY_IMAGES} photos.`);
  }

  if (orderedPendingPhotos.length === 0 && !hasPhotoOrderChanges) {
    return buildNoPhotoChangesResult({ existingPhotos, pendingPhotos, photoOrderIds });
  }

  const pendingOrderPosition = new Map(normalizedOrderIds.map((photoId, index) => [photoId, index]));
  const pendingIdToPersistedId =
    orderedPendingPhotos.length > 0
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

export const deletePropertyPhoto = async ({ propertyId, imageId }) => {
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

export const deletePropertyListing = async ({ propertyId, reasonIds = [] }) => {
  const response = await fetch(`${PROPERTY_API_BASE}`, {
    method: "DELETE",
    headers: {
      Authorization: getAccessToken(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      propertyId,
      property: propertyId,
      reasons: Array.isArray(reasonIds) ? reasonIds : [],
    }),
  });

  if (!response.ok) {
    const apiErrorMessage = await getApiErrorMessage(response, "Failed to delete property.");
    throw new Error(apiErrorMessage);
  }

  const rawBody = await response.text();
  if (!rawBody) {
    return {
      result: "deleted",
      propertyId,
    };
  }

  try {
    const parsedBody = JSON.parse(rawBody);
    if (parsedBody && typeof parsedBody === "object") {
      return parsedBody;
    }
  } catch {
    // No-op: default to deleted result below.
  }

  return {
    result: "deleted",
    propertyId,
  };
};

export const updatePropertyLifecycleStatus = async ({ propertyId, status }) => {
  const normalizedStatus = String(status || "").toUpperCase();
  const response = await fetch(`${PROPERTY_API_BASE}`, {
    method: "PATCH",
    headers: {
      Authorization: getAccessToken(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      propertyId,
      property: propertyId,
      status: normalizedStatus,
    }),
  });

  if (!response.ok) {
    const apiErrorMessage = await getApiErrorMessage(response, "Failed to update listing status.");
    throw new Error(apiErrorMessage);
  }
};
