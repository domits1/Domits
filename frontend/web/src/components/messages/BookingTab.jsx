import React, { useEffect, useMemo, useState } from "react";
import useFetchBookingDetails from "../../features/hostdashboard/hostmessages/hooks/useFetchBookingDetails";
import FetchPropertyById from "../../features/bookingengine/listingdetails/services/fetchPropertyById";

const formatMaybe = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
};

const pickFirstImage = (propObj) => {
  const images =
    propObj?.property?.images ||
    propObj?.property?.imageUrls ||
    propObj?.property?.image_urls ||
    propObj?.images ||
    propObj?.imageUrls ||
    propObj?.image_urls ||
    [];
  if (Array.isArray(images) && images.length > 0) return images[0];
  return null;
};

const BookingTab = ({ userId, contactId, dashboardType, threadContext }) => {
  const isHost = dashboardType === "host";

  // Try to fetch real booking/reservation details if they exist
  const { bookingDetails } = isHost
    ? useFetchBookingDetails(userId, contactId)
    : useFetchBookingDetails(contactId, userId);

  const merged = useMemo(() => {
    const bd = bookingDetails || {};
    const ctx = threadContext || {};

    const propertyId =
      bd?.property_id ||
      bd?.propertyId ||
      bd?.property?.id ||
      ctx?.propertyId ||
      null;

    const propertyTitle =
      bd?.propertyTitle ||
      bd?.property_name ||
      bd?.propertyName ||
      bd?.accoTitle ||
      ctx?.propertyTitle ||
      "";

    const propertyImage =
      bd?.accoImage ||
      bd?.propertyImage ||
      bd?.property_image ||
      ctx?.propertyImage ||
      null;

    const arrivalDate = bd?.arrivalDate || bd?.checkIn || ctx?.arrivalDate || null;
    const departureDate = bd?.departureDate || bd?.checkOut || ctx?.departureDate || null;

    const channel = ctx?.channel || "Domits";

    return {
      propertyId,
      propertyTitle,
      propertyImage,
      arrivalDate,
      departureDate,
      channel,
      raw: bd,
    };
  }, [bookingDetails, threadContext]);

  // If we only have propertyId (e.g. message came from listing page before booking),
  // fetch listing data like ListingDetails2 does.
  const [fetchedTitle, setFetchedTitle] = useState("");
  const [fetchedImage, setFetchedImage] = useState(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      const id = merged.propertyId;
      if (!id) {
        setFetchedTitle("");
        setFetchedImage(null);
        return;
      }

      if (merged.propertyTitle || merged.propertyImage) return;

      setFetching(true);
      try {
        const prop = await FetchPropertyById(id);
        if (!alive) return;

        const title =
          prop?.property?.title ||
          prop?.title ||
          "";

        const img = pickFirstImage(prop);

        setFetchedTitle(title);
        setFetchedImage(img);
      } catch (e) {
        if (!alive) return;
        setFetchedTitle("");
        setFetchedImage(null);
      } finally {
        if (alive) setFetching(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [merged.propertyId, merged.propertyTitle, merged.propertyImage]);

  const displayTitle = merged.propertyTitle || fetchedTitle;
  const displayImage = merged.propertyImage || fetchedImage;

  const hasAny = Boolean(displayTitle || displayImage || merged.arrivalDate || merged.departureDate);

  // Dynamic link (no hardcode)
  const listingHref = merged.propertyId ? `/listingdetails?ID=${merged.propertyId}` : null;

  return (
    <div className="booking-tab">
      <div className="booking-tab__header">
        <div className="booking-tab__title">Reservation</div>
        <div className="booking-tab__subtitle">{contactId ? `Source: ${merged.channel}` : "Select a conversation"}</div>
      </div>

      {!contactId ? (
        <div className="booking-tab__empty">Pick a conversation to see the listing / reservation context here.</div>
      ) : !hasAny ? (
        <div className="booking-tab__empty">
          No listing / reservation attached to this thread yet.
          <div className="booking-tab__hint">
            When sending a message from a listing page, include <b>propertyId</b> in the message/thread metadata.
          </div>
        </div>
      ) : (
        <div className="booking-tab__card">
          {displayImage ? (
            <div className="booking-tab__imageWrap">
              <img src={displayImage} alt={displayTitle || "Listing"} className="booking-tab__image" />
            </div>
          ) : null}

          <div className="booking-tab__content">
            <div className="booking-tab__propertyTitle">
              {displayTitle || (fetching ? "Loading listing…" : "Listing")}
            </div>

            {merged.arrivalDate || merged.departureDate ? (
              <div className="booking-tab__dates">
                <div className="booking-tab__dateRow">
                  <span className="booking-tab__label">Check-in</span>
                  <span className="booking-tab__value">{formatMaybe(merged.arrivalDate) || "—"}</span>
                </div>
                <div className="booking-tab__dateRow">
                  <span className="booking-tab__label">Checkout</span>
                  <span className="booking-tab__value">{formatMaybe(merged.departureDate) || "—"}</span>
                </div>
              </div>
            ) : null}

            <div className="booking-tab__actions">
              {listingHref ? (
                <a className="booking-tab__btn booking-tab__btn--primary" href={listingHref} target="_blank" rel="noreferrer">
                  View listing
                </a>
              ) : (
                <button className="booking-tab__btn" disabled title="No propertyId found">
                  View listing
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingTab;
