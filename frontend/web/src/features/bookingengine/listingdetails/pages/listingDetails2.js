import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Loading from "../../../hostdashboard/Loading";
import FetchPropertyById from "../services/fetchPropertyById";
import fetchHostInfo from "../services/fetchHostInfo";
import Header from "../components/header";
import SectionTabs from "../components/sectionTabs";
import PropertyContainer from "../views/propertyContainer";
import BookingContainer from "../views/bookingContainer";
import { normalizeAvailabilityRanges } from "../utils/dateAvailability";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const startOfUtcDay = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const dateToKey = (date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(
    2,
    "0"
  )}`;

const normalizeTimestampLike = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    const milliseconds = String(Math.trunc(numeric)).length <= 10 ? numeric * 1000 : numeric;
    const date = new Date(milliseconds);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  const normalizedString = String(value || "").trim();
  if (!normalizedString) {
    return null;
  }

  const date = new Date(normalizedString);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildAcceptedBookingDateKeys = (bookings) => {
  const blockedDateKeys = new Set();

  (Array.isArray(bookings) ? bookings : []).forEach((booking) => {
    const arrival = normalizeTimestampLike(
      booking?.arrivaldate ?? booking?.arrivalDate ?? booking?.arrival_date ?? booking?.StartDate
    );
    const departure = normalizeTimestampLike(
      booking?.departuredate ?? booking?.departureDate ?? booking?.departure_date ?? booking?.EndDate
    );

    if (!arrival || !departure) {
      return;
    }

    const start = startOfUtcDay(arrival);
    const endExclusive = startOfUtcDay(departure);

    if (endExclusive <= start) {
      blockedDateKeys.add(dateToKey(start));
      return;
    }

    for (let cursor = start.getTime(); cursor < endExclusive.getTime(); cursor += DAY_IN_MS) {
      blockedDateKeys.add(dateToKey(new Date(cursor)));
    }
  });

  return Array.from(blockedDateKeys);
};

const toPlainObject = (value) => (value && typeof value === "object" ? value : {});

const toArray = (value) => (Array.isArray(value) ? value : []);

const normalizeDateKey = (value) => {
  const normalized = String(value || "").trim();
  return DATE_KEY_PATTERN.test(normalized) ? normalized : "";
};

const normalizeDateKeyArray = (value) => toArray(value).map(normalizeDateKey).filter(Boolean);

const normalizeOptionalDateKeyArray = (...values) => {
  const providedValue = values.find((value) => Array.isArray(value));
  return Array.isArray(providedValue) ? normalizeDateKeyArray(providedValue) : null;
};

const normalizeCheckInSection = (checkIn) => {
  const safeCheckIn = toPlainObject(checkIn);
  return {
    checkIn: toPlainObject(safeCheckIn.checkIn),
    checkOut: toPlainObject(safeCheckIn.checkOut),
  };
};

const normalizeCalendarAvailability = (calendarAvailability) => {
  const safeCalendarAvailability = toPlainObject(calendarAvailability);
  return {
    ...safeCalendarAvailability,
    availableDateKeys: normalizeOptionalDateKeyArray(
      safeCalendarAvailability.availableDateKeys,
      safeCalendarAvailability.availableOverrideDateKeys
    ),
    externalBlockedDates: normalizeDateKeyArray(safeCalendarAvailability.externalBlockedDates),
    unavailableDateKeys: normalizeDateKeyArray(safeCalendarAvailability.unavailableDateKeys),
  };
};

const normalizeRulesArray = (value) =>
  toArray(value).filter((rule) => rule && typeof rule === "object" && rule.rule);

const normalizePolicyRulesObject = (value) => {
  const safeValue = toPlainObject(value);
  return Object.entries(safeValue).reduce((acc, [key, ruleValue]) => {
    if (key) {
      acc[key] = ruleValue;
    }
    return acc;
  }, {});
};

const normalizeListingProperty = (payload) => {
  const property = toPlainObject(payload);
  const nestedProperty = toPlainObject(property.property);
  const rawRulesArray = normalizeRulesArray(property.rules || nestedProperty.rules);
  const rawPolicyRules = normalizePolicyRulesObject(property.policyRules || nestedProperty.policyRules);
  const derivedPolicyRules =
    rawRulesArray.length > 0
      ? rawRulesArray.reduce((acc, rule) => {
          acc[rule.rule] = rule.value;
          return acc;
        }, {})
      : rawPolicyRules;
  const rawCancellationPolicy = property.cancellationPolicy || nestedProperty.cancellationPolicy || "";
  const normalizedCancellationPolicy =
    rawCancellationPolicy && typeof rawCancellationPolicy === "object"
      ? {
          policy_type: rawCancellationPolicy.policy_type || rawCancellationPolicy.type || "",
          policyType: rawCancellationPolicy.policyType || rawCancellationPolicy.policy_type || rawCancellationPolicy.type || "",
          type: rawCancellationPolicy.type || rawCancellationPolicy.policy_type || rawCancellationPolicy.policyType || "",
          id: rawCancellationPolicy.id || "",
          name: rawCancellationPolicy.name || "",
          description: rawCancellationPolicy.description || rawCancellationPolicy.summary || rawCancellationPolicy.label || "",
        }
      : rawCancellationPolicy;

  return {
    ...property,
    policyRules: derivedPolicyRules,
    cancellationPolicy: normalizedCancellationPolicy,
    rules:
      rawRulesArray.length > 0
        ? rawRulesArray
        : Object.entries(derivedPolicyRules).map(([key, value]) => ({
            rule: key,
            value,
          })),
    property: nestedProperty,
    images: toArray(property.images),
    availability: toArray(property.availability || nestedProperty.availability),
    pricing: toPlainObject(property.pricing),
    generalDetails: toArray(property.generalDetails),
    amenities: toArray(property.amenities),
    checkIn: normalizeCheckInSection(property.checkIn),
    calendarAvailability: normalizeCalendarAvailability(property.calendarAvailability),
  };
};

const fetchAcceptedBookingsByPropertyId = async (propertyId) => {
  const normalizedPropertyId = String(propertyId || "").trim();
  if (!normalizedPropertyId) return [];

  const response = await fetch(
    `https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?readType=blockedDates&property_Id=${encodeURIComponent(normalizedPropertyId)}`,
    { method: "GET" }
  );

  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

const ListingDetails2 = () => {
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);
  const id = searchParams.get("ID");

  const [property, setProperty] = useState({});
  const [host, setHost] = useState({});
  const [acceptedBookingDateKeys, setAcceptedBookingDateKeys] = useState([]);
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMessageHost, setShowMessageHost] = useState(false);

  const externalBlockedDateKeys = useMemo(
    () =>
      Array.isArray(property?.calendarAvailability?.externalBlockedDates)
        ? property.calendarAvailability.externalBlockedDates
        : [],
    [property?.calendarAvailability?.externalBlockedDates]
  );
  const calendarUnavailableDateKeys = useMemo(
    () =>
      Array.isArray(property?.calendarAvailability?.unavailableDateKeys)
        ? property.calendarAvailability.unavailableDateKeys
        : [],
    [property?.calendarAvailability?.unavailableDateKeys]
  );
  const unavailableDateKeys = useMemo(
    () =>
      Array.from(
        new Set([
          ...externalBlockedDateKeys,
          ...calendarUnavailableDateKeys,
          ...(Array.isArray(acceptedBookingDateKeys) ? acceptedBookingDateKeys : []),
        ])
      ),
    [acceptedBookingDateKeys, calendarUnavailableDateKeys, externalBlockedDateKeys]
  );
  const availabilityRanges = useMemo(
    () => normalizeAvailabilityRanges(property?.availability),
    [property?.availability]
  );
  const availableDateKeys = useMemo(
    () =>
      Array.isArray(property?.calendarAvailability?.availableDateKeys)
        ? property.calendarAvailability.availableDateKeys
        : null,
    [property?.calendarAvailability?.availableDateKeys]
  );

  useEffect(() => {
    setLoading(true);
    setError(null);
    setProperty({});
    setHost({});
    setAcceptedBookingDateKeys([]);
    setCheckInDate("");
    setCheckOutDate("");

    const loadData = async () => {
      try {
        const [fetchedProperty, acceptedBookings] = await Promise.all([
          FetchPropertyById(id),
          fetchAcceptedBookingsByPropertyId(id).catch(() => []),
        ]);
        const normalizedProperty = normalizeListingProperty(fetchedProperty);
        setProperty(normalizedProperty);
        setAcceptedBookingDateKeys(buildAcceptedBookingDateKeys(acceptedBookings));

        const hostData = await fetchHostInfo(normalizedProperty?.property?.hostId);
        setHost(hostData);

        setLoading(false);
      } catch {
        setError("Something went wrong while fetching the requested data, please try again later.");
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  if (loading) return <Loading />;

  if (error) {
    return (
      <div className="listing-details-error">
        <h2>{error}</h2>
      </div>
    );
  }

  const hasAmenities = Array.isArray(property?.amenities) && property.amenities.length > 0;
  const hasLocation = Boolean(property?.location?.city || property?.location?.country);

  const sectionItems = [
    { id: "photos", label: "Photos", targetId: "listing-photos" },
    ...(hasAmenities ? [{ id: "amenities", label: "Amenities", targetId: "listing-amenities" }] : []),
    { id: "host", label: "Host", targetId: "listing-host" },
    ...(hasLocation ? [{ id: "location", label: "Location", targetId: "listing-location" }] : []),
    { id: "policies", label: "Policies", targetId: "listing-policies" },
  ];

  return (
    <div className="listing-details">
      <SectionTabs sections={sectionItems} />
      <Header
        title={property?.property?.title}
        rating={property?.property?.rating}
        generalDetails={property?.generalDetails}
      />

      <div className="container">
        <PropertyContainer
          property={property}
          host={host}
          location={property.location}
          onContactHost={
            (property?.property?.hostId || property?.property?.hostID)
              ? () => setShowMessageHost(true)
              : undefined
          }
          unavailableDateKeys={calendarUnavailableDateKeys}
          bookedDateKeys={acceptedBookingDateKeys}
          externalBlockedDateKeys={externalBlockedDateKeys}
          availabilityRanges={availabilityRanges}
          availableDateKeys={availableDateKeys}
          checkInDate={checkInDate}
          checkOutDate={checkOutDate}
          setCheckInDate={setCheckInDate}
          setCheckOutDate={setCheckOutDate}
        >
          <BookingContainer
            property={property}
            host={host}
            propertyId={id}
            unavailableDateKeys={unavailableDateKeys}
            bookedDateKeys={acceptedBookingDateKeys}
            availabilityRanges={availabilityRanges}
            availableDateKeys={availableDateKeys}
            checkInDate={checkInDate}
            setCheckInDate={setCheckInDate}
            checkOutDate={checkOutDate}
            setCheckOutDate={setCheckOutDate}
            showMessageHost={showMessageHost}
            setShowMessageHost={setShowMessageHost}
          />
        </PropertyContainer>
      </div>
    </div>
  );
};

export default ListingDetails2;
