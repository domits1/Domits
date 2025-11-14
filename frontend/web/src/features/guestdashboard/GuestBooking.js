import React, { useEffect, useState, useCallback } from "react";
import { Auth } from "aws-amplify";
import { useNavigate } from "react-router-dom";
import { getAccessToken } from "../../services/getAccessToken";
import dateFormatterDD_MM_YYYY from "../../utils/DateFormatterDD_MM_YYYY";

const API_FETCH_BOOKINGS =
  "https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?readType=guest";
const API_LISTING_DETAILS_BASE =
  "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/listingDetails";

const S3_URL = "https://accommodation.s3.eu-north-1.amazonaws.com/";
const placeholderImage =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'><rect width='100%' height='100%' fill='%23eee'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-family='Arial' font-size='20'>No image</text></svg>";

const buildListingDetailsUrl = (propertyId) =>
  `${API_LISTING_DETAILS_BASE}?property=${encodeURIComponent(propertyId)}`;

const normalizeImageUrl = (maybeKeyOrUrl) => {
  if (!maybeKeyOrUrl) return placeholderImage;
  const val = String(maybeKeyOrUrl);
  return val.startsWith("http") ? val : `${S3_URL}${val}`;
};

const toDate = (value) => {
  if (value == null) return null;

  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    const milliseconds =
      String(Math.trunc(numericValue)).length <= 10
        ? numericValue * 1000
        : numericValue;
    const parsed = new Date(milliseconds);
    return isNaN(parsed) ? null : parsed;
  }

  const parsed = new Date(value);
  return isNaN(parsed) ? null : parsed;
};

const splitBookingsByTime = (bookingList) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekAhead = new Date(today);
  weekAhead.setDate(today.getDate() + 7);

  const currentBookings = [];
  const upcomingBookings = [];
  const pastBookings = [];

  bookingList.forEach((bookingItem) => {
    const arrivalDate =
      toDate(
        bookingItem?.arrivaldate ??
          bookingItem?.arrival_date ??
          bookingItem?.arrivalDate
      ) || null;

    const departureDate =
      toDate(
        bookingItem?.departuredate ??
          bookingItem?.departure_date ??
          bookingItem?.departureDate
      ) || null;

    if (!arrivalDate || !departureDate) {
      upcomingBookings.push(bookingItem);
      return;
    }

    const arrival = new Date(arrivalDate);
    arrival.setHours(0, 0, 0, 0);

    const departure = new Date(departureDate);
    departure.setHours(0, 0, 0, 0);

    if (departure < today) {
      pastBookings.push(bookingItem);
      return;
    }

    const isOngoing = arrival <= today && departure >= today;
    const startsThisWeek = arrival > today && arrival <= weekAhead;

    if (isOngoing || startsThisWeek) {
      currentBookings.push(bookingItem);
    } else if (arrival > weekAhead) {
      upcomingBookings.push(bookingItem);
    } else {
      upcomingBookings.push(bookingItem);
    }
  });

  return { currentBookings, upcomingBookings, pastBookings };
};

const renderBookingRow = (
  bookingItem,
  index,
  { getPropertyId, propertyMap, handleBookingClick, formatBookingDates }
) => {
  const propertyId = getPropertyId(bookingItem);

  const fallbackTitle =
    bookingItem?.title ||
    bookingItem?.Title ||
    (bookingItem?.property_id
      ? `Property #${bookingItem.property_id}`
      : "Booking");

  const propertyInfo = propertyId ? propertyMap[propertyId] : undefined;
  const displayTitle = propertyInfo?.title || fallbackTitle;

  const candidateImageKey =
    propertyInfo?.imageUrl ||
    bookingItem?.propertyImage ||
    bookingItem?.image ||
    bookingItem?.images?.[0]?.key ||
    bookingItem?.property?.coverImage ||
    bookingItem?.property?.images?.[0]?.key ||
    null;

  const imageUrl = normalizeImageUrl(candidateImageKey);

  const bookingCity =
    bookingItem?.city || bookingItem?.location?.city || "Unknown city";

  const bookingStatus = String(
    bookingItem?.status || bookingItem?.Status || ""
  );

  return (
    <div
      key={
        bookingItem?.id || bookingItem?.ID || `${index}-${displayTitle}`
      }
      className="guest-card-row"
      role="button"
      tabIndex={0}
      onClick={() => handleBookingClick(bookingItem)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ")
          handleBookingClick(bookingItem);
      }}
    >
      <div className="guest-booking-row-inner">
        <div className="guest-booking-row-image">
          <img
            src={imageUrl}
            alt={displayTitle}
            onError={(e) => (e.currentTarget.src = placeholderImage)}
          />
        </div>
        <div className="guest-booking-row-main">
          <div className="row-title">{displayTitle}</div>
          <div className="row-sub">{bookingCity}</div>
          <div className="guest-booking-row-meta">
            <span className="guest-booking-status">
              {bookingStatus || "—"}
            </span>
            <span className="guest-booking-dates">
              {formatBookingDates(bookingItem)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

function GuestBooking() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [guestId, setGuestId] = useState(null);
  const [user, setUser] = useState({ name: "", email: "" });
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");

  const [propertyMap, setPropertyMap] = useState({});
  const [propLoading, setPropLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const userInfo = await Auth.currentUserInfo();
        const cognitoSub = userInfo?.attributes?.sub || null;
        setGuestId(cognitoSub);
        setUser({
          name: userInfo?.attributes?.given_name || "",
          email: userInfo?.attributes?.email || "",
        });
      } catch (err) {
        setError("Could not load your session.");
        setIsLoading(false);
      }
    })();
  }, []);

  const getPropertyId = (b) =>
    b?.property_id ??
    b?.propertyId ??
    b?.PropertyID ??
    b?.id ??
    b?.ID ??
    null;

  const getTimestamp = (bookingItem) => {
    const numericValue = Number(
      bookingItem?.createdat ??
        bookingItem?.createdAt ??
        bookingItem?.arrivaldate ??
        bookingItem?.arrivalDate
    );
    if (Number.isFinite(numericValue)) {
      const ms =
        String(Math.trunc(numericValue)).length <= 10
          ? numericValue * 1000
          : numericValue;
      return ms;
    }
    const dateString =
      bookingItem?.createdAt ??
      bookingItem?.arrivalDate ??
      bookingItem?.arrival_date;
    const parsedDate = dateString ? new Date(dateString) : null;
    return parsedDate && !isNaN(parsedDate) ? parsedDate.getTime() : 0;
  };

  const fetchBookings = useCallback(async () => {
    if (!guestId) return;

    setIsLoading(true);
    setError("");

    try {
      const requestUrl = new URL(API_FETCH_BOOKINGS);
      requestUrl.searchParams.set("guestId", guestId);

      const response = await fetch(requestUrl.toString(), {
        method: "GET",
        headers: {
          Authorization: await getAccessToken(),
        },
      });

      if (!response.ok) {
        const responseText = await response.text().catch(() => "");
        throw new Error(
          `Fetch failed: ${response.status} ${response.statusText} ${responseText}`.trim()
        );
      }

      const rawData = await response.json().catch(async () => {
        const fallbackText = await response.text();
        try {
          return JSON.parse(fallbackText);
        } catch {
          return fallbackText;
        }
      });

      let normalizedBookings = [];
      if (Array.isArray(rawData)) normalizedBookings = rawData;
      else if (Array.isArray(rawData?.data)) normalizedBookings = rawData.data;
      else if (Array.isArray(rawData?.response))
        normalizedBookings = rawData.response;
      else if (typeof rawData?.body === "string") {
        try {
          const innerParsed = JSON.parse(rawData.body);
          if (Array.isArray(innerParsed)) normalizedBookings = innerParsed;
          else if (Array.isArray(innerParsed?.response))
            normalizedBookings = innerParsed.response;
        } catch {}
      }

      normalizedBookings.sort((a, b) => getTimestamp(b) - getTimestamp(a));

      setBookings(normalizedBookings);
    } catch (err) {
      setError("Could not load your bookings.");
    } finally {
      setIsLoading(false);
    }
  }, [guestId]);

  useEffect(() => {
    if (guestId) fetchBookings();
  }, [guestId, fetchBookings]);

  const fetchPropertyDetails = useCallback(
    async (propertyIds) => {
      if (!propertyIds?.length) return;

      const toFetch = propertyIds.filter((id) => id && !propertyMap[id]);
      if (!toFetch.length) return;

      setPropLoading(true);
      try {
        const results = await Promise.all(
          toFetch.map(async (pid) => {
            try {
              const resp = await fetch(buildListingDetailsUrl(pid));
              if (!resp.ok) throw new Error();
              const data = await resp.json().catch(() => ({}));

              const title =
                data?.title ||
                data?.propertyTitle ||
                data?.name ||
                data?.property?.title ||
                `Property #${pid}`;

              const imageKey =
                data?.coverImage ||
                data?.image ||
                data?.images?.[0]?.key ||
                data?.property?.coverImage ||
                data?.property?.images?.[0]?.key ||
                null;

              return [pid, { title, imageUrl: normalizeImageUrl(imageKey) }];
            } catch {
              return [
                pid,
                { title: `Property #${pid}`, imageUrl: placeholderImage },
              ];
            }
          })
        );

        setPropertyMap((prev) => {
          const next = { ...prev };
          results.forEach(([pid, obj]) => {
            next[pid] = obj;
          });
          return next;
        });
      } finally {
        setPropLoading(false);
      }
    },
    [propertyMap]
  );

  useEffect(() => {
    if (!bookings?.length) return;
    const paid = bookings.filter(
      (b) =>
        String(b?.status ?? b?.Status ?? "").toLowerCase() === "paid"
    );
    const ids = Array.from(new Set(paid.map(getPropertyId).filter(Boolean)));
    if (ids.length) fetchPropertyDetails(ids);
  }, [bookings, fetchPropertyDetails]);

  const handleBookingClick = (bookingItem) => {
    const propertyId = getPropertyId(bookingItem);
    if (propertyId)
      navigate(`/listingdetails?ID=${encodeURIComponent(propertyId)}`);
  };

  const formatBookingDates = (bookingItem) => {
    const arrivalDate =
      toDate(
        bookingItem?.arrivaldate ??
          bookingItem?.arrival_date ??
          bookingItem?.arrivalDate
      ) || null;

    const departureDate =
      toDate(
        bookingItem?.departuredate ??
          bookingItem?.departure_date ??
          bookingItem?.departureDate
      ) || null;

    if (!arrivalDate || !departureDate) return "-";

    return `${dateFormatterDD_MM_YYYY(arrivalDate)} → ${dateFormatterDD_MM_YYYY(
      departureDate
    )}`;
  };

  return (
    <main className="page-body">
      <div className="dashboardHost">
        <div className="dashboardContainer">
          <div className="dashboardLeft">
            <h3 className="welcomeMsg">{user.name || "Guest"} Bookings</h3>

            <div className="dashboardHead">
              <div className="buttonBox">
                <button
                  className="greenBtn"
                  onClick={fetchBookings}
                  disabled={isLoading}
                >
                  {isLoading ? "Refreshing…" : "Refresh"}
                </button>
              </div>
              <h3>My Paid Bookings:</h3>
            </div>

            {isLoading ? (
              <div className="guest-booking-loader">Loading…</div>
            ) : error ? (
              <div className="guest-booking-error" role="alert">
                {error}
              </div>
            ) : (
              (() => {
                const paidBookings = bookings.filter(
                  (b) =>
                    String(b?.status ?? b?.Status ?? "").toLowerCase() ===
                    "paid"
                );

                if (paidBookings.length === 0) {
                  return (
                    <div className="emptyState">
                      <p>You don’t have any paid bookings yet.</p>
                    </div>
                  );
                }

                const {
                  currentBookings,
                  upcomingBookings,
                  pastBookings,
                } = splitBookingsByTime(paidBookings);

                return (
                  <div className="guest-booking-bookingContent">
                    {propLoading && (
                      <div className="guest-booking-loader-inline">
                        Loading property details…
                      </div>
                    )}

                    <div className="guest-booking-summary-grid">
                      <section className="guest-card guest-card--current">
                        <div className="guest-card-header">
                          <span>Current / This Week</span>
                          <span className="guest-booking-badge">
                            {currentBookings.length}
                          </span>
                        </div>
                        <div className="guest-card-body">
                          {currentBookings.length === 0 ? (
                            <p className="guest-booking-empty">
                              No current bookings this week.
                            </p>
                          ) : (
                            currentBookings.map((bookingItem, index) =>
                              renderBookingRow(bookingItem, index, {
                                getPropertyId,
                                propertyMap,
                                handleBookingClick,
                                formatBookingDates,
                              })
                            )
                          )}
                        </div>
                      </section>

                      <section className="guest-card guest-card--upcoming">
                        <div className="guest-card-header">
                          <span>Upcoming Bookings</span>
                          <span className="guest-booking-badge">
                            {upcomingBookings.length}
                          </span>
                        </div>
                        <div className="guest-card-body">
                          {upcomingBookings.length === 0 ? (
                            <p className="guest-booking-empty">
                              You don’t have any upcoming bookings yet.
                            </p>
                          ) : (
                            upcomingBookings.map((bookingItem, index) =>
                              renderBookingRow(bookingItem, index, {
                                getPropertyId,
                                propertyMap,
                                handleBookingClick,
                                formatBookingDates,
                              })
                            )
                          )}
                        </div>
                      </section>

                      <section className="guest-card guest-card--past">
                        <div className="guest-card-header">
                          <span>Past Bookings</span>
                          <span className="guest-booking-badge">
                            {pastBookings.length}
                          </span>
                        </div>
                        <div className="guest-card-body">
                          {pastBookings.length === 0 ? (
                            <p className="guest-booking-empty">
                              You don’t have any past bookings yet.
                            </p>
                          ) : (
                            pastBookings.map((bookingItem, index) =>
                              renderBookingRow(bookingItem, index, {
                                getPropertyId,
                                propertyMap,
                                handleBookingClick,
                                formatBookingDates,
                              })
                            )
                          )}
                        </div>
                      </section>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default GuestBooking;
