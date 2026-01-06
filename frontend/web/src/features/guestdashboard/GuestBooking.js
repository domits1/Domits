import React, { useEffect, useState, useCallback } from "react";
import { Auth } from "aws-amplify";
import { useNavigate } from "react-router-dom";

import { getGuestBookings, buildListingDetailsUrl } from "./services/bookingAPI";

import dateFormatterDD_MM_YYYY from "../../utils/DateFormatterDD_MM_YYYY";
import { getBookingTimestamp } from "../../utils/getBookingTimestamp";
import { timestampToDate } from "../../utils/timestampToDate";
import { placeholderImage, normalizeImageUrl } from "./utils/image";

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
      timestampToDate(
        bookingItem?.arrivaldate ??
          bookingItem?.arrival_date ??
          bookingItem?.arrivalDate
      ) || null;

    const departureDate =
      timestampToDate(
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

    if (isOngoing || startsThisWeek) currentBookings.push(bookingItem);
    else upcomingBookings.push(bookingItem);
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
    (bookingItem?.property_id ? `Property #${bookingItem.property_id}` : "Booking");

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
    propertyInfo?.city || bookingItem?.city || bookingItem?.location?.city || "Unknown city";

  const bookingStatus = String(bookingItem?.status || bookingItem?.Status || "");

  const hostName =
    propertyInfo?.hostName ||
    bookingItem?.hostName ||
    bookingItem?.host_name ||
    bookingItem?.host?.name ||
    bookingItem?.host?.fullName ||
    "";

  return (
    <div
      key={bookingItem?.id || bookingItem?.ID || `${index}-${displayTitle}`}
      className="guest-card-row"
      role="button"
      tabIndex={0}
      onClick={() => handleBookingClick(bookingItem)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") handleBookingClick(bookingItem);
      }}
    >
      <div className="guest-booking-row-inner">
        <div className="guest-booking-row-image">
          <img
            src={imageUrl}
            alt={displayTitle}
            onError={(e) => {
              e.currentTarget.src = placeholderImage;
            }}
          />
        </div>

        <div className="guest-booking-row-main">
          <div className="row-title">{displayTitle}</div>
          <div className="row-sub">{bookingCity}</div>

          {hostName && (
            <div className="row-host">
              Host: <span className="row-host-name">{hostName}</span>
            </div>
          )}

          <div className="guest-booking-row-meta">
            <span className="guest-booking-status">{bookingStatus || "—"}</span>
            <span className="guest-booking-dates">{formatBookingDates(bookingItem)}</span>
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
    let isMounted = true;

    const loadUser = async () => {
      try {
        const userInfo = await Auth.currentUserInfo();
        if (!isMounted) return;

        const cognitoSub = userInfo?.attributes?.sub || null;
        setGuestId(cognitoSub);
        setUser({
          name: userInfo?.attributes?.given_name || "",
          email: userInfo?.attributes?.email || "",
        });
      } catch {
        if (isMounted) setError("Could not load your session.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadUser();
    return () => {
      isMounted = false;
    };
  }, []);

  const getPropertyId = (booking) =>
    booking?.property_id ??
    booking?.propertyId ??
    booking?.PropertyID ??
    booking?.id ??
    booking?.ID ??
    null;

  const fetchBookings = useCallback(async () => {
    if (!guestId) return;

    setIsLoading(true);
    setError("");

    try {
      const bookingData = await getGuestBookings(guestId);

      let normalizedBookings = [];
      if (Array.isArray(bookingData)) normalizedBookings = bookingData;
      else if (Array.isArray(bookingData?.data)) normalizedBookings = bookingData.data;
      else if (Array.isArray(bookingData?.response)) normalizedBookings = bookingData.response;
      else if (typeof bookingData?.body === "string") {
        try {
          const innerParsed = JSON.parse(bookingData.body);
          if (Array.isArray(innerParsed)) normalizedBookings = innerParsed;
          else if (Array.isArray(innerParsed?.response)) normalizedBookings = innerParsed.response;
        } catch {}
      }

      normalizedBookings.sort((a, b) => getBookingTimestamp(b) - getBookingTimestamp(a));
      setBookings(normalizedBookings);
    } catch {
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

              const property = data.property || {};
              const images = Array.isArray(data.images) ? data.images : [];
              const location = data.location || {};

              const host = data.host || data.hostInfo || property.host || property.hostInfo || null;

              const hostNameFromHost =
                host?.name ||
                host?.fullName ||
                (host?.firstName && host?.lastName ? `${host.firstName} ${host.lastName}` : null);

              const hostNameFromProperty =
                property.username && property.familyname
                  ? `${String(property.username).trim()} ${String(property.familyname).trim()}`
                  : (property.username && String(property.username).trim()) ||
                    (property.familyname && String(property.familyname).trim()) ||
                    null;

              const hostName =
                hostNameFromHost || hostNameFromProperty || data.hostName || property.hostName || "";

              const title = property.title || property.name || `Property #${property.id || pid}`;

              const firstImageKey = images[0]?.key || null;

              const subtitle = property.subtitle || "";
              const cityFromLocation = location.city || null;
              const cityFromSubtitle = subtitle ? subtitle.split(",")[0].trim() : "";
              const city = cityFromLocation || cityFromSubtitle || "";

              return [
                pid,
                {
                  title,
                  imageUrl: normalizeImageUrl(firstImageKey),
                  city,
                  hostName,
                },
              ];
            } catch {
              return [
                pid,
                {
                  title: `Property #${pid}`,
                  imageUrl: placeholderImage,
                  city: "",
                  hostName: "",
                },
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
      (booking) => String(booking?.status ?? booking?.Status ?? "").toLowerCase() === "paid"
    );

    const ids = Array.from(new Set(paid.map(getPropertyId).filter(Boolean)));
    if (ids.length) fetchPropertyDetails(ids);
  }, [bookings, fetchPropertyDetails]);

  const handleBookingClick = (bookingItem) => {
    const propertyId = getPropertyId(bookingItem);
    if (propertyId) navigate(`/listingdetails?ID=${encodeURIComponent(propertyId)}`);
  };

  const formatBookingDates = (bookingItem) => {
    const arrivalDate =
      timestampToDate(
        bookingItem?.arrivaldate ?? bookingItem?.arrival_date ?? bookingItem?.arrivalDate
      ) || null;

    const departureDate =
      timestampToDate(
        bookingItem?.departuredate ?? bookingItem?.departure_date ?? bookingItem?.departureDate
      ) || null;

    if (!arrivalDate || !departureDate) return "-";

    return `${dateFormatterDD_MM_YYYY(arrivalDate)} → ${dateFormatterDD_MM_YYYY(departureDate)}`;
  };

  const paidBookings = bookings.filter(
    (b) => String(b?.status ?? b?.Status ?? "").toLowerCase() === "paid"
  );

  const { currentBookings, upcomingBookings, pastBookings } = splitBookingsByTime(paidBookings);

  return (
    <div className="guest-dashboard-shell">
      <div className="guest-dashboard-page-body guest-booking-page-body">
        <h2>{user.name || "Guest"} Bookings</h2>

        <div className="guest-dashboard-dashboards">
          <div className="guest-dashboard-content guest-booking-dashboard-content">
            <div className="guest-dashboard-accomodation-side guest-booking-accomodation-side">
              <div className="dashboardHead">
                <div className="buttonBox">
                  <button className="greenBtn" onClick={fetchBookings} disabled={isLoading}>
                    {isLoading ? "Refreshing…" : "Refresh"}
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="guest-booking-loader">Loading…</div>
              ) : error ? (
                <div className="guest-booking-error" role="alert">
                  {error}
                </div>
              ) : paidBookings.length === 0 ? (
                <div className="emptyState">
                  <p>You don’t have any bookings yet.</p>
                </div>
              ) : (
                <div className="guest-booking-bookingContent">
                  {propLoading && (
                    <div className="guest-booking-loader-inline">Loading property details…</div>
                  )}

                  <div className="guest-booking-summary-grid">
                    <section className="guest-card guest-card--current">
                      <div className="guest-card-header">
                        <span>Current / This Week</span>
                        <span className="guest-booking-badge">{currentBookings.length}</span>
                      </div>
                      <div className="guest-card-body">
                        {currentBookings.length === 0 ? (
                          <p className="guest-booking-empty">No current bookings this week.</p>
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
                        <span className="guest-booking-badge">{upcomingBookings.length}</span>
                      </div>
                      <div className="guest-card-body">
                        {upcomingBookings.length === 0 ? (
                          <p className="guest-booking-empty">You don’t have any upcoming bookings yet.</p>
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
                        <span className="guest-booking-badge">{pastBookings.length}</span>
                      </div>
                      <div className="guest-card-body">
                        {pastBookings.length === 0 ? (
                          <p className="guest-booking-empty">You don’t have any past bookings yet.</p>
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
              )}
            </div>

            <aside className="guest-dashboard-personalInfoContent guest-booking-right-empty" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default GuestBooking;
