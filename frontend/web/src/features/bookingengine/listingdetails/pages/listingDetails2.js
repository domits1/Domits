import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Loading from "../../../hostdashboard/Loading";
import FetchPropertyById from "../services/fetchPropertyById";
import fetchHostInfo from "../services/fetchHostInfo";
import Header from "../components/header";
import PropertyContainer from "../views/propertyContainer";
import BookingContainer from "../views/bookingContainer";
import { getFutureDateKey } from "../utils/dateAvailability";

const BOOKINGS_API_URL =
  "https://ct7hrhtgac.execute-api.eu-north-1.amazonaws.com/default/retrieveBookingByAccommodationAndStatus";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const startOfUtcDay = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const dateToKey = (date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;

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

const parseBookingResponse = async (response) => {
  const payload = await response.json();
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.body)) {
    return payload.body;
  }

  if (typeof payload?.body === "string") {
    try {
      const parsed = JSON.parse(payload.body);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const fetchAcceptedBookingsByPropertyId = async (propertyId) => {
  const normalizedPropertyId = String(propertyId || "").trim();
  if (!normalizedPropertyId) {
    return [];
  }

  const response = await fetch(BOOKINGS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      AccoID: normalizedPropertyId,
      Status: "Accepted",
    }),
  });

  if (!response.ok) {
    throw new Error(`Could not fetch accepted bookings (${response.status}).`);
  }

  return parseBookingResponse(response);
};

const ListingDetails2 = () => {
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);
  const id = searchParams.get("ID");

  const [property, setProperty] = useState({});
  const [host, setHost] = useState({});
  const [acceptedBookingDateKeys, setAcceptedBookingDateKeys] = useState([]);
  const [checkInDate, setCheckInDate] = useState(getFutureDateKey(1));
  const [checkOutDate, setCheckOutDate] = useState(getFutureDateKey(2));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const unavailableDateKeys = useMemo(
    () =>
      Array.from(
        new Set([
          ...((Array.isArray(property?.calendarAvailability?.externalBlockedDates)
            ? property.calendarAvailability.externalBlockedDates
            : [])),
          ...((Array.isArray(acceptedBookingDateKeys) ? acceptedBookingDateKeys : [])),
        ])
      ),
    [acceptedBookingDateKeys, property?.calendarAvailability?.externalBlockedDates]
  );

  useEffect(() => {
    setLoading(true);
    setError(null);
    setProperty({});
    setHost({});
    setAcceptedBookingDateKeys([]);
    setCheckInDate(getFutureDateKey(1));
    setCheckOutDate(getFutureDateKey(2));

    const loadData = async () => {
      try {
        const [fetchedProperty, acceptedBookings] = await Promise.all([
          FetchPropertyById(id),
          fetchAcceptedBookingsByPropertyId(id).catch(() => []),
        ]);
        setProperty(fetchedProperty);
        setAcceptedBookingDateKeys(buildAcceptedBookingDateKeys(acceptedBookings));

        const hostData = await fetchHostInfo(fetchedProperty?.property?.hostId);
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

  return (
    <div className="listing-details">
      <Header title={property?.property?.title} />

      <div className="container">
        <PropertyContainer
          property={property}
          unavailableDateKeys={unavailableDateKeys}
          checkInDate={checkInDate}
          checkOutDate={checkOutDate}
          setCheckInDate={setCheckInDate}
          setCheckOutDate={setCheckOutDate}
        />
        <BookingContainer
          property={property}
          host={host}
          propertyId={id}
          unavailableDateKeys={unavailableDateKeys}
          checkInDate={checkInDate}
          setCheckInDate={setCheckInDate}
          checkOutDate={checkOutDate}
          setCheckOutDate={setCheckOutDate}
        />
      </div>
    </div>
  );
};

export default ListingDetails2;
