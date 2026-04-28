import amenitiesCatalog from "../../../../store/amenities";
import { placeholderImage, resolveAccommodationImageUrls } from "../../../../utils/accommodationImage";
import { AMENITY_CATEGORY_ORDER, POLICY_RULE_CONFIG } from "../../hostproperty/constants";

const DEFAULT_LOCALE = "en";
const MAX_FEATURED_AMENITIES = 6;
const MAX_FEATURED_POLICIES = 3;
const MAX_FEATURED_GALLERY_IMAGES = 5;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const toDateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(
    2,
    "0"
  )}`;

const AMENITY_LOOKUP = new Map(
  amenitiesCatalog.map(({ id, amenity, category }) => [
    String(id),
    {
      id: String(id),
      label: amenity,
      category,
    },
  ])
);

const POLICY_RULE_LOOKUP = new Map(
  POLICY_RULE_CONFIG.map((ruleConfig) => [ruleConfig.rule, ruleConfig])
);

const RESTRICTION_KEYS = Object.freeze({
  minimumStay: "MinimumStay",
});

const cleanText = (value) => String(value || "").replaceAll(/\s+/g, " ").trim();
const formatShortDate = (value) => {
  const normalizedValue = cleanText(value);
  if (!DATE_KEY_PATTERN.test(normalizedValue)) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat("en-GB", {
      month: "short",
      day: "2-digit",
    }).format(new Date(`${normalizedValue}T00:00:00`));
  } catch {
    return normalizedValue;
  }
};

const formatTimestampLabel = (value) => {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(parsedValue));
  } catch {
    return "";
  }
};

const humanizeCamelCase = (value) =>
  cleanText(value)
    .replaceAll("/", " / ")
    .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ");

const readNumber = (value, fallback = 0) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const formatCountLabel = (value, singularLabel, pluralLabel = `${singularLabel}s`) => {
  const count = Math.trunc(readNumber(value, 0));
  if (count < 1) {
    return "";
  }

  return `${count} ${count === 1 ? singularLabel : pluralLabel}`;
};

const formatNightlyRateLabel = (nightlyRate) => {
  const normalizedNightlyRate = Math.trunc(readNumber(nightlyRate, 0));
  if (normalizedNightlyRate < 1) {
    return "";
  }

  return `EUR ${normalizedNightlyRate} / night`;
};

const buildRestrictionValueMap = (availabilityRestrictions) =>
  new Map(
    (Array.isArray(availabilityRestrictions) ? availabilityRestrictions : [])
      .map((entry) => {
        const restrictionKey = cleanText(entry?.restriction);
        if (!restrictionKey) {
          return null;
        }

        return [restrictionKey, Math.trunc(readNumber(entry?.value, 0))];
      })
      .filter(Boolean)
  );

const getGeneralDetailValue = (generalDetails, detailName) => {
  const matchedDetail = (Array.isArray(generalDetails) ? generalDetails : []).find(
    (detail) => cleanText(detail?.detail).toLowerCase() === detailName.toLowerCase()
  );
  return Math.trunc(readNumber(matchedDetail?.value, 0));
};

const buildLocationLabel = (location, summaryProperty) => {
  const city = cleanText(location?.city || summaryProperty?.location?.city);
  const country = cleanText(location?.country || summaryProperty?.location?.country);
  const joinedLocation = [city, country].filter(Boolean).join(", ");
  if (joinedLocation) {
    return joinedLocation;
  }

  return cleanText(summaryProperty?.location);
};

const buildAmenityItems = (amenities) => {
  const rawAmenities = Array.isArray(amenities) ? amenities : [];
  const mappedAmenities = rawAmenities
    .map((amenityEntry) => {
      const amenityId = cleanText(amenityEntry?.amenityId || amenityEntry?.amenity_id || amenityEntry?.id);
      const catalogEntry = AMENITY_LOOKUP.get(amenityId);
      if (catalogEntry) {
        return catalogEntry;
      }

      const fallbackLabel = cleanText(amenityEntry?.amenity || amenityEntry?.name || amenityEntry?.label);
      if (!fallbackLabel) {
        return null;
      }

      return {
        id: amenityId || fallbackLabel,
        label: fallbackLabel,
        category: cleanText(amenityEntry?.category) || "Other",
      };
    })
    .filter(Boolean);

  const categoryRank = new Map(AMENITY_CATEGORY_ORDER.map((category, index) => [category, index]));
  return mappedAmenities.sort((leftAmenity, rightAmenity) => {
    const leftRank = categoryRank.get(leftAmenity.category) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = categoryRank.get(rightAmenity.category) ?? Number.MAX_SAFE_INTEGER;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return leftAmenity.label.localeCompare(rightAmenity.label);
  });
};

const buildPolicyHighlights = (rules) => {
  const ruleEntries = Array.isArray(rules) ? rules : [];
  const configuredRules = ruleEntries
    .map((ruleEntry) => {
      const ruleName = cleanText(ruleEntry?.rule);
      const ruleConfig = POLICY_RULE_LOOKUP.get(ruleName);
      if (!ruleConfig) {
        return null;
      }

      const isEnabled = ruleEntry?.value === true;
      const isActive = ruleConfig.invert ? !isEnabled : isEnabled;
      return isActive ? ruleConfig.label : null;
    })
    .filter(Boolean);

  const configuredRuleNames = new Set(POLICY_RULE_CONFIG.map(({ rule }) => rule));
  const fallbackRules = ruleEntries
    .filter((ruleEntry) => {
      const ruleName = cleanText(ruleEntry?.rule);
      return ruleName && !configuredRuleNames.has(ruleName) && ruleEntry?.value === true;
    })
    .map((ruleEntry) => humanizeCamelCase(ruleEntry.rule));

  return [...configuredRules, ...fallbackRules];
};

const buildGalleryImages = (propertyDetails, summaryProperty, imageVariant) => {
  const detailImages = resolveAccommodationImageUrls(propertyDetails?.images, imageVariant);
  if (detailImages.length > 0) {
    return detailImages;
  }

  const summaryImages = Array.isArray(summaryProperty?.galleryImages) ? summaryProperty.galleryImages : [];
  return summaryImages.length > 0 ? summaryImages : [placeholderImage];
};

const buildHeroDescription = ({ title, description, propertyTypeLabel, locationLabel, guestsLabel }) => {
  if (description) {
    return description;
  }

  const subject = cleanText(title) || "This listing";
  const locationFragment = locationLabel ? ` in ${locationLabel}` : "";
  const guestFragment = guestsLabel ? ` for ${guestsLabel.toLowerCase()}` : "";
  const typeFragment = propertyTypeLabel ? `This ${propertyTypeLabel.toLowerCase()} stay` : subject;
  return `${typeFragment}${locationFragment}${guestFragment}.`.replaceAll(/\s+/g, " ").trim();
};

const buildStatItems = ({ guestsLabel, bedroomsLabel, bathroomsLabel, nightlyRateLabel, minimumStayLabel }) =>
  [
    { id: "guests", label: "Capacity", value: guestsLabel },
    { id: "bedrooms", label: "Bedrooms", value: bedroomsLabel },
    { id: "bathrooms", label: "Bathrooms", value: bathroomsLabel },
    { id: "rate", label: "Base rate", value: nightlyRateLabel },
    { id: "minimum-stay", label: "Minimum stay", value: minimumStayLabel },
  ].filter((item) => Boolean(item.value));

const joinListWithAnd = (items) => {
  const safeItems = items.filter(Boolean);
  if (safeItems.length < 1) {
    return "";
  }
  if (safeItems.length === 1) {
    return safeItems[0];
  }
  if (safeItems.length === 2) {
    return `${safeItems[0]} and ${safeItems[1]}`;
  }
  return `${safeItems.slice(0, -1).join(", ")}, and ${safeItems[safeItems.length - 1]}`;
};

const buildArrivalSummary = (checkInLabel, checkOutLabel) => {
  const arrivalParts = [];

  if (checkInLabel) {
    arrivalParts.push(`check-in ${checkInLabel}`);
  }

  if (checkOutLabel) {
    arrivalParts.push(`check-out ${checkOutLabel}`);
  }

  return joinListWithAnd(arrivalParts);
};

const buildBookingSummary = (nightlyRateLabel, minimumStayLabel) => {
  const bookingParts = [];

  if (nightlyRateLabel) {
    bookingParts.push(`from ${nightlyRateLabel}`);
  }

  if (minimumStayLabel) {
    bookingParts.push(minimumStayLabel.toLowerCase());
  }

  return joinListWithAnd(bookingParts);
};

const buildTrustCards = ({
  guestsLabel,
  bedroomsLabel,
  bathroomsLabel,
  checkInLabel,
  checkOutLabel,
  nightlyRateLabel,
  minimumStayLabel,
  policyHighlights,
  locationLabel,
}) => {
  const staySummary = joinListWithAnd([guestsLabel, bedroomsLabel, bathroomsLabel]);
  const arrivalSummary = buildArrivalSummary(checkInLabel, checkOutLabel);
  const bookingSummary = buildBookingSummary(nightlyRateLabel, minimumStayLabel);

  return [
    {
      id: "stay-details",
      title: "Stay details",
      description: staySummary || "Property details are imported from the selected listing.",
    },
    {
      id: "arrival-guidelines",
      title: "Arrival and policies",
      description:
        policyHighlights.slice(0, MAX_FEATURED_POLICIES).join(", ") ||
        arrivalSummary ||
        "Arrival and policy settings can be refined before publish.",
    },
    {
      id: "location-context",
      title: "Booking context",
      description:
        joinListWithAnd([bookingSummary, locationLabel ? `located in ${locationLabel}` : ""]) ||
        "Live pricing and availability are checked when guests request a quote.",
    },
  ];
};

const buildJourneyStops = ({
  checkInLabel,
  checkOutLabel,
  guestsLabel,
  bedroomsLabel,
  featuredAmenities,
  locationLabel,
  nightlyRateLabel,
  minimumStayLabel,
}) => {
  const arrivalSummary = buildArrivalSummary(checkInLabel, checkOutLabel);
  const staySummary = joinListWithAnd([guestsLabel, bedroomsLabel]);
  const amenitySummary = joinListWithAnd(featuredAmenities.slice(0, 3).map((amenity) => amenity.label.toLowerCase()));
  const bookingSummary = buildBookingSummary(nightlyRateLabel, minimumStayLabel);

  return [
    {
      id: "arrival",
      title: "Arrival",
      description: arrivalSummary || "Arrival details are imported from the property settings.",
    },
    {
      id: "stay",
      title: "Stay",
      description:
        joinListWithAnd([staySummary, amenitySummary ? `features ${amenitySummary}` : ""]) ||
        "The stay layout is built from your listing content.",
    },
    {
      id: "surroundings",
      title: "Surroundings",
      description: locationLabel ? `Positioned in ${locationLabel}.` : "Location details are imported from the listing.",
    },
    {
      id: "next-steps",
      title: "Next steps",
      description:
        bookingSummary || "Guests can request live availability and pricing before they continue.",
    },
  ];
};

const normalizeDateKeys = (dateKeys) =>
  (Array.isArray(dateKeys) ? dateKeys : [])
    .map((dateKey) => cleanText(dateKey))
    .filter((dateKey) => DATE_KEY_PATTERN.test(dateKey))
    .sort((leftDateKey, rightDateKey) => leftDateKey.localeCompare(rightDateKey));

const formatCountSummary = ({ count, singularLabel, pluralLabel, emptyLabel }) => {
  if (count < 1) {
    return emptyLabel;
  }

  return `${count} ${count === 1 ? singularLabel : pluralLabel}`;
};

const buildSyncSummary = (hasExternalCalendarSync, syncedSourceCount) => {
  if (!hasExternalCalendarSync) {
    return "No iCal sync connected yet";
  }

  return formatCountSummary({
    count: syncedSourceCount,
    singularLabel: "iCal sync connected",
    pluralLabel: "iCal syncs connected",
    emptyLabel: "No iCal sync connected yet",
  });
};

const buildCalendarAvailability = (calendarAvailability) => {
  const externalBlockedDates = normalizeDateKeys(calendarAvailability?.externalBlockedDates);
  const unavailableDateKeys = normalizeDateKeys(calendarAvailability?.unavailableDateKeys);
  const allBlockedDates = Array.from(new Set([...externalBlockedDates, ...unavailableDateKeys])).sort(
    (leftDateKey, rightDateKey) => leftDateKey.localeCompare(rightDateKey)
  );

  const syncedSourceCount = Math.max(0, Math.trunc(readNumber(calendarAvailability?.syncedSourceCount, 0)));
  const hasExternalCalendarSync =
    calendarAvailability?.hasExternalCalendarSync === true || syncedSourceCount > 0;
  const todayDateKey = toDateKey(new Date());
  const nextBlockedDate = allBlockedDates.find((dateKey) => dateKey >= todayDateKey) || "";
  const lastSyncLabel = formatTimestampLabel(calendarAvailability?.lastSyncAt);

  const syncSummary = buildSyncSummary(hasExternalCalendarSync, syncedSourceCount);

  const externalBlockedSummary = formatCountSummary({
    count: externalBlockedDates.length,
    singularLabel: "imported external booking",
    pluralLabel: "imported external bookings",
    emptyLabel: "No imported external bookings",
  });
  const unavailableDateSummary = formatCountSummary({
    count: unavailableDateKeys.length,
    singularLabel: "PMS blocked date",
    pluralLabel: "PMS blocked dates",
    emptyLabel: "No PMS blocked dates",
  });
  const blockedDateSummary = formatCountSummary({
    count: allBlockedDates.length,
    singularLabel: "blocked date in total",
    pluralLabel: "blocked dates in total",
    emptyLabel: "No blocked dates",
  });

  const nextBlockedLabel = nextBlockedDate ? `Next blocked: ${formatShortDate(nextBlockedDate)}` : "";

  return {
    externalBlockedDates,
    unavailableDateKeys,
    blockedDateCount: allBlockedDates.length,
    externalBlockedDateCount: externalBlockedDates.length,
    unavailableDateCount: unavailableDateKeys.length,
    hasExternalCalendarSync,
    syncedSourceCount,
    syncSummary,
    externalBlockedSummary,
    unavailableDateSummary,
    blockedDateSummary,
    lastSyncLabel,
    nextBlockedDate,
    nextBlockedLabel,
    callout:
      hasExternalCalendarSync || allBlockedDates.length > 0
        ? "Imported external bookings and PMS blocked dates are shown below. Live quote requests still validate current availability before a guest can continue."
        : "No external bookings or PMS blocked dates have been imported yet. Live quote requests still validate current availability before a guest can continue.",
  };
};

export const buildWebsiteTemplateModel = ({ propertyDetails, summaryProperty = null, imageVariant = "web" }) => {
  const property = propertyDetails?.property || {};
  const generalDetails = Array.isArray(propertyDetails?.generalDetails) ? propertyDetails.generalDetails : [];
  const availabilityRestrictions = buildRestrictionValueMap(propertyDetails?.availabilityRestrictions);
  const galleryImages = buildGalleryImages(propertyDetails, summaryProperty, imageVariant);
  const previewImages = galleryImages.slice(0, 3);
  const featuredGalleryImages = galleryImages.slice(0, MAX_FEATURED_GALLERY_IMAGES);
  const locationLabel = buildLocationLabel(propertyDetails?.location, summaryProperty);

  const title = cleanText(property.title || summaryProperty?.title || summaryProperty?.label || "Untitled listing");
  const subtitle = cleanText(property.subtitle);
  const description = cleanText(property.description || summaryProperty?.description);
  const propertyTypeLabel = cleanText(propertyDetails?.propertyType?.spaceType || propertyDetails?.propertyType?.property_type);
  const nightlyRate = Math.trunc(
    readNumber(propertyDetails?.pricing?.roomRate ?? propertyDetails?.pricing?.roomrate, 0)
  );
  const minimumStay = Math.trunc(readNumber(availabilityRestrictions.get(RESTRICTION_KEYS.minimumStay), 0));
  const guests = getGeneralDetailValue(generalDetails, "Guests");
  const bedrooms = getGeneralDetailValue(generalDetails, "Bedrooms");
  const beds = getGeneralDetailValue(generalDetails, "Beds");
  const bathrooms = getGeneralDetailValue(generalDetails, "Bathrooms");
  const guestsLabel = formatCountLabel(guests, "Guest");
  const bedroomsLabel = formatCountLabel(bedrooms, "Bedroom");
  const bedsLabel = formatCountLabel(beds, "Bed");
  const bathroomsLabel = formatCountLabel(bathrooms, "Bathroom");
  const nightlyRateLabel = formatNightlyRateLabel(nightlyRate);
  const minimumStayLabel = minimumStay > 0 ? `${minimumStay} night minimum` : "";

  const normalizedCheckIn = propertyDetails?.checkIn || { checkIn: {}, checkOut: {} };
  const checkInLabel = cleanText(normalizedCheckIn?.checkIn?.from);
  const checkOutLabel = cleanText(normalizedCheckIn?.checkOut?.till || normalizedCheckIn?.checkOut?.from);

  const amenities = buildAmenityItems(propertyDetails?.amenities);
  const featuredAmenities = amenities.slice(0, MAX_FEATURED_AMENITIES);
  const policyHighlights = buildPolicyHighlights(propertyDetails?.rules);
  const availabilitySnapshot = buildCalendarAvailability(propertyDetails?.calendarAvailability);

  return {
    source: {
      propertyId: cleanText(property.id || summaryProperty?.value),
      hostId: cleanText(property.hostId || property.host_id || summaryProperty?.hostId),
      status: cleanText(property.status || summaryProperty?.status || "INACTIVE"),
      locale: DEFAULT_LOCALE,
    },
    site: {
      title,
      subtitle,
      templateReadyTitle: title,
      locationLabel,
    },
    media: {
      heroImage: galleryImages[0] || placeholderImage,
      galleryImages,
      previewImages,
      featuredGalleryImages,
    },
    hero: {
      eyebrow: joinListWithAnd([propertyTypeLabel, locationLabel]) || "Imported listing data",
      title,
      subtitle,
      description: buildHeroDescription({
        title,
        description,
        propertyTypeLabel,
        locationLabel,
        guestsLabel,
      }),
      imageUrl: galleryImages[0] || placeholderImage,
    },
    stay: {
      propertyTypeLabel,
      guests,
      bedrooms,
      beds,
      bathrooms,
      guestsLabel,
      bedroomsLabel,
      bedsLabel,
      bathroomsLabel,
      nightlyRate,
      nightlyRateLabel,
      minimumStay,
      minimumStayLabel,
      checkInLabel,
      checkOutLabel,
      stats: buildStatItems({
        guestsLabel,
        bedroomsLabel,
        bathroomsLabel,
        nightlyRateLabel,
        minimumStayLabel,
      }),
    },
    location: {
      city: cleanText(propertyDetails?.location?.city),
      country: cleanText(propertyDetails?.location?.country),
      label: locationLabel,
      narrative: locationLabel ? `This stay is located in ${locationLabel}.` : "",
    },
    amenities: {
      featured: featuredAmenities,
      all: amenities,
      summary:
        featuredAmenities.length > 0
          ? joinListWithAnd(featuredAmenities.slice(0, 3).map((amenity) => amenity.label.toLowerCase()))
          : "",
    },
    policies: {
      featured: policyHighlights.slice(0, MAX_FEATURED_POLICIES),
      all: policyHighlights,
      summary: policyHighlights.slice(0, MAX_FEATURED_POLICIES).join(", "),
    },
    availability: availabilitySnapshot,
    gallery: {
      images: featuredGalleryImages,
      countLabel: `${galleryImages.length} imported photo${galleryImages.length === 1 ? "" : "s"}`,
    },
    trustCards: buildTrustCards({
      guestsLabel,
      bedroomsLabel,
      bathroomsLabel,
      checkInLabel,
      checkOutLabel,
      nightlyRateLabel,
      minimumStayLabel,
      policyHighlights,
      locationLabel,
    }),
    journeyStops: buildJourneyStops({
      checkInLabel,
      checkOutLabel,
      guestsLabel,
      bedroomsLabel,
      featuredAmenities,
      locationLabel,
      nightlyRateLabel,
      minimumStayLabel,
    }),
    callToAction: {
      label: "Check live availability",
      note: "Live pricing and availability stay server-side and are checked on quote request.",
    },
    visibility: {
      topBar: true,
      trustCards: true,
      gallerySection: true,
      amenitiesPanel: true,
      availabilityCalendar: true,
      callToAction: true,
      journeyStops: true,
      chatWidget: true,
    },
  };
};
