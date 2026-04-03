import React, { useEffect, useState, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { Auth } from "aws-amplify";
import { useNavigate } from "react-router-dom";

import { getGuestBookings } from "./services/bookingAPI";
import { fetchPropertySummaries } from "./services/propertySummaryService";

import dateFormatterDD_MM_YYYY from "../../utils/DateFormatterDD_MM_YYYY";
import { getBookingTimestamp } from "../../utils/getBookingTimestamp";
import { timestampToDate } from "../../utils/timestampToDate";
import { placeholderImage, normalizeImageUrl } from "./utils/image";
import {
  resolveAccommodationImageUrl,
} from "../../utils/accommodationImage";
import {
  getBookingId,
  getPaidBookings,
  getPropertyId,
  normalizeGuestBookingsResponse,
  splitBookingsByTime,
} from "./utils/guestDashboardUtils";

const formatBookingDates = (bookingItem) => {
  const arrivalDate =
    timestampToDate(bookingItem?.arrivaldate ?? bookingItem?.arrival_date ?? bookingItem?.arrivalDate) || null;
  const departureDate =
    timestampToDate(bookingItem?.departuredate ?? bookingItem?.departure_date ?? bookingItem?.departureDate) || null;

  if (!arrivalDate || !departureDate) return "-";

  return `${dateFormatterDD_MM_YYYY(arrivalDate)} -> ${dateFormatterDD_MM_YYYY(departureDate)}`;
};

const BookingRow = ({ bookingItem, propertyMap, handleBookingClick }) => {
  const propertyId = getPropertyId(bookingItem);
  const fallbackTitle =
    bookingItem?.title ||
    bookingItem?.Title ||
    (bookingItem?.property_id ? `Property #${bookingItem.property_id}` : "Booking");
  const propertyInfo = propertyId ? propertyMap[propertyId] : undefined;
  const displayTitle = propertyInfo?.title || fallbackTitle;
  const imageUrl =
    propertyInfo?.imageUrl ||
    resolveAccommodationImageUrl(bookingItem?.images?.[0], "thumb") ||
    resolveAccommodationImageUrl(bookingItem?.property?.images?.[0], "thumb") ||
    normalizeImageUrl(
      bookingItem?.propertyImage || bookingItem?.image || bookingItem?.property?.coverImage || null
    );
  const bookingCity = propertyInfo?.city || bookingItem?.city || bookingItem?.location?.city || "Unknown city";
  const bookingStatus = String(bookingItem?.status || bookingItem?.Status || "");
  const hostName =
    propertyInfo?.hostName ||
    bookingItem?.hostName ||
    bookingItem?.host_name ||
    bookingItem?.host?.name ||
    bookingItem?.host?.fullName ||
    "";

  return (
    <button
      type="button"
      className="guest-card-row"
      onClick={() => handleBookingClick(bookingItem)}
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
            <span className="guest-booking-status">{bookingStatus || "-"}</span>
            <span className="guest-booking-dates">{formatBookingDates(bookingItem)}</span>
          </div>
        </div>
      </div>
    </button>
  );
};

BookingRow.propTypes = {
  bookingItem: PropTypes.object.isRequired,
  propertyMap: PropTypes.object.isRequired,
  handleBookingClick: PropTypes.func.isRequired,
};

const BookingSection = ({ title, bookings, emptyMessage, propertyMap, handleBookingClick, extraClassName = "" }) => (
  <section className={`guest-card ${extraClassName}`.trim()}>
    <div className="guest-card-header">
      <span>{title}</span>
      <span className="guest-booking-badge">{bookings.length}</span>
    </div>
    <div className="guest-card-body">
      {bookings.length === 0 ? (
        <p className="guest-booking-empty">{emptyMessage}</p>
      ) : (
        bookings.map((bookingItem, index) => (
          <BookingRow
            key={bookingItem?.id || bookingItem?.ID || `${index}-${title}`}
            bookingItem={bookingItem}
            propertyMap={propertyMap}
            handleBookingClick={handleBookingClick}
          />
        ))
      )}
    </div>
  </section>
);

BookingSection.propTypes = {
  title: PropTypes.string.isRequired,
  bookings: PropTypes.array.isRequired,
  emptyMessage: PropTypes.string.isRequired,
  propertyMap: PropTypes.object.isRequired,
  handleBookingClick: PropTypes.func.isRequired,
  extraClassName: PropTypes.string,
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

        setGuestId(userInfo?.attributes?.sub || null);
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

  const fetchBookings = useCallback(async () => {
    if (!guestId) return;

    setIsLoading(true);
    setError("");

    try {
      const bookingData = await getGuestBookings(guestId);
      const normalizedBookings = normalizeGuestBookingsResponse(bookingData);
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
        const fetchedSummaries = await fetchPropertySummaries(toFetch);
        setPropertyMap((prev) => {
          const next = { ...prev };
          Object.entries(fetchedSummaries).forEach(([propertyId, summary]) => {
            next[propertyId] = summary;
          });
          return next;
        });
      } finally {
        setPropLoading(false);
      }
    },
    [propertyMap]
  );

  const paidBookings = useMemo(() => getPaidBookings(bookings), [bookings]);

  useEffect(() => {
    if (!paidBookings.length) return;

    const ids = Array.from(new Set(paidBookings.map(getPropertyId).filter(Boolean)));
    if (ids.length) fetchPropertyDetails(ids);
  }, [paidBookings, fetchPropertyDetails]);

  const handleBookingClick = (bookingItem) => {
    const bookingId = getBookingId(bookingItem);
    const propertyId = getPropertyId(bookingItem);
    if (bookingId) {
      navigate(`/guestdashboard/reservation/${encodeURIComponent(bookingId)}`);
      return;
    }

    if (propertyId) {
      navigate(`/listingdetails?ID=${encodeURIComponent(propertyId)}`);
    }
  };

  const { currentBookings, upcomingBookings, pastBookings } = useMemo(
    () => splitBookingsByTime(paidBookings),
    [paidBookings]
  );

  let bookingContent;
  if (isLoading) {
    bookingContent = <div className="guest-booking-loader">Loading...</div>;
  } else if (error) {
    bookingContent = (
      <div className="guest-booking-error" role="alert">
        {error}
      </div>
    );
  } else if (paidBookings.length === 0) {
    bookingContent = (
      <div className="emptyState">
        <p>You do not have any bookings yet.</p>
      </div>
    );
  } else {
    bookingContent = (
      <div className="guest-booking-bookingContent">
        {propLoading && <div className="guest-booking-loader-inline">Loading property details...</div>}

        <div className="guest-booking-summary-grid">
          <BookingSection
            title="Current / This Week"
            bookings={currentBookings}
            emptyMessage="No current bookings this week."
            propertyMap={propertyMap}
            handleBookingClick={handleBookingClick}
          />

          <BookingSection
            title="Upcoming Bookings"
            bookings={upcomingBookings}
            emptyMessage="You do not have any upcoming bookings yet."
            propertyMap={propertyMap}
            handleBookingClick={handleBookingClick}
          />

          <BookingSection
            title="Past Bookings"
            bookings={pastBookings}
            emptyMessage="You do not have any past bookings yet."
            propertyMap={propertyMap}
            handleBookingClick={handleBookingClick}
            extraClassName="guest-card--past"
          />
        </div>
      </div>
    );
  }

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
                    {isLoading ? "Refreshing..." : "Refresh"}
                  </button>
                </div>
              </div>

              {bookingContent}
            </div>

            <aside className="guest-dashboard-personalInfoContent guest-booking-right-empty" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default GuestBooking;
