import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import DateSelectionContainer from "./dateSelectionContainer";
import GuestSelectionContainer from "./guestSelectionContainer";
import Pricing from "../components/pricing";
import useHandleReservePress from "../hooks/handleReservePress";
import {
  buildUnavailableDateSet,
  hasUnavailableDateInStayRange,
  isUnavailableDate,
} from "../utils/dateAvailability";
import {
  getActiveCancellationPolicyId,
  parseCancellationPolicyString,
  parseCancellationPolicy,
} from "../../../../utils/policyDisplayUtils";
import SkeletonBlock from "../components/SkeletonBlock";

import { UserProvider } from "../../../hostdashboard/hostmessages/context/AuthContext";
import { WebSocketProvider } from "../../../hostdashboard/hostmessages/context/webSocketContext";
import { useAuth } from "../../../hostdashboard/hostmessages/hooks/useAuth";
import ChatScreen from "../../../../components/messages/ChatScreen";

import "../../../../components/messages/messagesV2.scss";

const UNIFIED_MESSAGING_API = "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default";

const MessageHostModalInner = ({ onClose, hostId, hostName, hostImage, propertyId }) => {
  const { userId } = useAuth();
  const [resolvedThreadId, setResolvedThreadId] = useState(null);

  const inFlightRef = useRef(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    const root = globalThis;
    root.addEventListener("keydown", onKey);
    return () => root.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;

    const findThreadIdForListing = (threads) => {
      const list = Array.isArray(threads) ? threads : [];
      const matches = list.filter(
        (t) =>
          ((t?.hostId === hostId && t?.guestId === userId) || (t?.hostId === userId && t?.guestId === hostId)) &&
          String(t?.propertyId || "") === String(propertyId || "")
      );

      if (!matches.length) return null;

      matches.sort((a, b) => {
        const aTime = Number(a?.lastMessageAt ?? a?.updatedAt ?? a?.createdAt ?? 0);
        const bTime = Number(b?.lastMessageAt ?? b?.updatedAt ?? b?.createdAt ?? 0);
        return bTime - aTime;
      });

      return matches[0]?.id || null;
    };

    const run = async () => {
      if (!userId || !hostId || !propertyId) return;
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      try {
        const res = await fetch(`${UNIFIED_MESSAGING_API}/threads?userId=${encodeURIComponent(userId)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          console.warn(`Threads fetch failed: ${res.status}`);
          if (!cancelled) setResolvedThreadId(null);
          return;
        }

        const threads = await res.json();
        const found = findThreadIdForListing(threads);

        if (!cancelled) setResolvedThreadId(found);
      } catch {
        if (!cancelled) setResolvedThreadId(null);
      } finally {
        inFlightRef.current = false;
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [userId, hostId, propertyId]);

  if (!userId) {
    return (
      <dialog className="message-host-modal" open aria-label="Message host">
        <button
          type="button"
          className="message-host-modal__backdrop"
          onClick={onClose}
          aria-label="Close message host modal"
        />
        <div className="message-host-modal__content">
          <div className="message-host-modal__loading">Loading user…</div>
        </div>
      </dialog>
    );
  }

  return (
    <WebSocketProvider userId={userId}>
      <dialog className="message-host-modal" open aria-label="Message host">
        <button
          type="button"
          className="message-host-modal__backdrop"
          onClick={onClose}
          aria-label="Close message host modal"
        />
        <div className="message-host-modal__content">
          <div className="messages-v2 message-host-modal__shell">
            <ChatScreen
              userId={userId}
              contactId={hostId}
              contactName={hostName || "Host"}
              contactImage={hostImage || null}
              threadId={resolvedThreadId}
              propertyId={propertyId || null}
              onClose={onClose}
              dashboardType="guest"
            />
          </div>
        </div>
      </dialog>
    </WebSocketProvider>
  );
};

const calculateNights = (checkInDate, checkOutDate) => {
  if (!checkInDate || !checkOutDate) {
    return 0;
  }

  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const timeDifference = checkOut.getTime() - checkIn.getTime();
  return Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
};

const BookingContainer = ({
  property,
  host = {},
  propertyId = null,
  unavailableDateKeys = [],
  checkInDate = "",
  setCheckInDate = () => {},
  checkOutDate = "",
  setCheckOutDate = () => {},
  showMessageHost: showMessageHostProp,
  setShowMessageHost: setShowMessageHostProp,
  isLoading = false,
}) => {
  const [adults, setAdults] = useState(1);
  const [kids, setKids] = useState(0);
  const [showMobileStickyBar, setShowMobileStickyBar] = useState(false);
  const [localShowMessageHost, setLocalShowMessageHost] = useState(false);
  const bookingCardRef = useRef(null);

  const showMessageHost = showMessageHostProp === undefined ? localShowMessageHost : showMessageHostProp;
  const setShowMessageHost = setShowMessageHostProp === undefined ? setLocalShowMessageHost : setShowMessageHostProp;

  const handleReservePress = useHandleReservePress();
  const unavailableDateSet = useMemo(
    () => buildUnavailableDateSet(unavailableDateKeys),
    [unavailableDateKeys]
  );
  const nights = useMemo(() => calculateNights(checkInDate, checkOutDate), [checkInDate, checkOutDate]);

  const hostId = property?.property?.hostId || property?.property?.hostID || null;
  const hostFirstName = host?.givenName || host?.given_name || "";
  const hostLastName = host?.familyName || host?.family_name || "";
  const hostName = hostFirstName || hostLastName
    ? `${hostFirstName} ${hostLastName}`.trim()
    : host?.name || "Host";
  const hostImage = host?.profileImage || null;
  const resolvedPropertyId = propertyId || property?.property?.id || property?.property?.ID || null;

  const maxGuests = Number(
    property?.property?.maxGuests ||
    property?.policyRules?.maxGuests ||
    property?.policyRules?.MaxGuests ||
    0
  );

  const cancellationPolicy = useMemo(() => {
    const rules = property?.rules || [];
    const policyId = getActiveCancellationPolicyId(rules) || getActiveCancellationPolicyId(property?.policyRules || {});
    if (policyId) return parseCancellationPolicyString(policyId);
    if (property?.cancellationPolicy) return parseCancellationPolicyString(property.cancellationPolicy);
    return parseCancellationPolicy(rules);
  }, [property?.rules, property?.policyRules, property?.cancellationPolicy]);

  useEffect(() => {
    if (!showMessageHost) return;

    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;

    const scrollBarWidth = globalThis.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollBarWidth > 0) body.style.paddingRight = `${scrollBarWidth}px`;

    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, [showMessageHost]);

  useEffect(() => {
    const updateStickyBarVisibility = () => {
      const bookingCard = bookingCardRef.current;
      const isMobile = globalThis.innerWidth <= 768;

      if (!bookingCard || !isMobile) {
        setShowMobileStickyBar(false);
        return;
      }

      const cardBottom = bookingCard.getBoundingClientRect().bottom;
      setShowMobileStickyBar(cardBottom < globalThis.innerHeight - 24);
    };

    updateStickyBarVisibility();
    const frameId = globalThis.requestAnimationFrame(updateStickyBarVisibility);
    globalThis.addEventListener("scroll", updateStickyBarVisibility, { passive: true });
    globalThis.addEventListener("resize", updateStickyBarVisibility);

    return () => {
      globalThis.cancelAnimationFrame(frameId);
      globalThis.removeEventListener("scroll", updateStickyBarVisibility);
      globalThis.removeEventListener("resize", updateStickyBarVisibility);
    };
  }, []);

  useEffect(() => {
    if (!checkInDate) {
      return;
    }

    if (
      isUnavailableDate(checkInDate, unavailableDateSet) ||
      (checkOutDate && hasUnavailableDateInStayRange(checkInDate, checkOutDate, unavailableDateSet))
    ) {
      setCheckInDate("");
      setCheckOutDate("");
    }
  }, [checkInDate, checkOutDate, setCheckInDate, setCheckOutDate, unavailableDateSet]);

  const handleCheckInDateChange = (value) => {
    if (!value) {
      setCheckInDate("");
      setCheckOutDate("");
      return;
    }

    if (isUnavailableDate(value, unavailableDateSet)) {
      alert("Check in date is unavailable.");
      return;
    }

    if (checkOutDate && checkOutDate <= value) {
      alert("Check in date has to be before check out date.");
      return;
    }

    if (checkOutDate && hasUnavailableDateInStayRange(value, checkOutDate, unavailableDateSet)) {
      alert("Selected stay includes unavailable dates.");
      return;
    }

    setCheckInDate(value);
  };

  const handleCheckOutDateChange = (value) => {
    if (!value) {
      setCheckOutDate("");
      return;
    }

    if (!checkInDate) {
      alert("Select a check in date first.");
      return;
    }

    if (checkInDate >= value) {
      alert("Check out date has to be after check in date.");
      return;
    }

    if (hasUnavailableDateInStayRange(checkInDate, value, unavailableDateSet)) {
      alert("Selected stay includes unavailable dates.");
      return;
    }

    setCheckOutDate(value);
  };

  const mobileStickyDateProps = {
    checkInDate,
    setCheckInDate: handleCheckInDateChange,
    checkOutDate,
    setCheckOutDate: handleCheckOutDateChange,
    unavailableDateKeys,
    className: "date-container--mobile-sticky",
  };

  const handleReserveClick = () => {
    if (!resolvedPropertyId) {
      return;
    }

    const checkInTime = new Date(checkInDate).getTime();
    const checkOutTime = new Date(checkOutDate).getTime();
    if (!Number.isFinite(checkInTime) || !Number.isFinite(checkOutTime) || nights < 1) {
      return;
    }

    handleReservePress(
      resolvedPropertyId,
      checkInTime,
      checkOutTime,
      adults + kids
    );
  };

  if (isLoading) {
    return (
      <div className="listing-booking-card" ref={bookingCardRef} aria-busy="true">
        <div className="listing-booking-card__price-header">
          <SkeletonBlock width={96} height={28} />
          <SkeletonBlock width={72} height={16} />
        </div>
        <div className="date-container">
          <div className="date-box">
            <SkeletonBlock width={68} height={12} style={{ marginBottom: 8 }} />
            <SkeletonBlock width="82%" height={18} />
          </div>
          <div className="date-box">
            <SkeletonBlock width={76} height={12} style={{ marginBottom: 8 }} />
            <SkeletonBlock width="82%" height={18} />
          </div>
        </div>
        <div className="guests-container">
          <div className="guests-summary">
            <SkeletonBlock width="70%" height={18} />
          </div>
        </div>
        <div className="pricing-container">
          <SkeletonBlock width="100%" height={16} style={{ marginBottom: 10 }} />
          <SkeletonBlock width="88%" height={16} />
        </div>
        <SkeletonBlock width="100%" height={44} borderRadius={10} />
      </div>
    );
  }

  return (
    <div className="listing-booking-card" ref={bookingCardRef}>
      <div className="listing-booking-card__price-header">
        <span className="listing-booking-card__price">
          €{Number(property?.pricing?.roomRate || 0).toFixed(0)}
        </span>
        <span className="listing-booking-card__per-night">per night</span>
      </div>

      <DateSelectionContainer
        checkInDate={checkInDate}
        setCheckInDate={handleCheckInDateChange}
        checkOutDate={checkOutDate}
        setCheckOutDate={handleCheckOutDateChange}
        unavailableDateKeys={unavailableDateKeys}
      />

      <GuestSelectionContainer setAdultsParent={setAdults} setKidsParent={setKids} maxGuests={maxGuests} />

      <Pricing pricing={property.pricing} nights={nights} />

      <button
        className="reserve-btn"
        disabled={adults < 1 || nights < 1}
        onClick={handleReserveClick}
      >
        Reserve
      </button>

      <p className="note">You won’t be charged yet</p>

      {hostId && (
        <button
          type="button"
          className="listing-booking-card__message-host"
          onClick={() => setShowMessageHost(true)}
        >
          Message host
        </button>
      )}

      <div className="listing-booking-card__trust-badges">
        {cancellationPolicy?.id && (
          <div className="listing-booking-card__trust-item">
            <span className="listing-booking-card__trust-check">✓</span>{" "}{cancellationPolicy.type} cancellation
          </div>
        )}
        <div className="listing-booking-card__trust-item">
          <span className="listing-booking-card__trust-check">✓</span>{" "}Instant confirmation
        </div>
        <div className="listing-booking-card__trust-item">
          <span className="listing-booking-card__trust-check">✓</span>{" "}Secure payment
        </div>
      </div>

      <div
        className={`listing-booking-card__mobile-sticky${
          showMobileStickyBar ? " listing-booking-card__mobile-sticky--visible" : ""
        }`}
      >
        <div className="listing-booking-card__mobile-sticky-price">
          <span className="listing-booking-card__price">
            €{Number(property?.pricing?.roomRate || 0).toFixed(0)}
          </span>
          <span className="listing-booking-card__per-night">per night</span>
        </div>

        <DateSelectionContainer {...mobileStickyDateProps} />

        <button
          className="reserve-btn listing-booking-card__mobile-sticky-reserve"
          disabled={adults < 1 || nights < 1}
          onClick={handleReserveClick}
        >
          Reserve
        </button>
      </div>

      {showMessageHost && hostId && (
        <UserProvider>
          <MessageHostModalInner
            onClose={() => setShowMessageHost(false)}
            hostId={hostId}
            hostName={hostName}
            hostImage={hostImage}
            propertyId={resolvedPropertyId}
          />
        </UserProvider>
      )}
    </div>
  );
};

MessageHostModalInner.propTypes = {
  onClose: PropTypes.func,
  hostId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  hostName: PropTypes.string,
  hostImage: PropTypes.string,
  propertyId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

BookingContainer.propTypes = {
  property: PropTypes.shape({
    pricing: PropTypes.object,
    rules: PropTypes.array,
    cancellationPolicy: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    policyRules: PropTypes.shape({
      maxGuests: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      MaxGuests: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
    property: PropTypes.shape({
      hostId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      hostID: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      ID: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      maxGuests: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
  }).isRequired,
  host: PropTypes.shape({
    givenName: PropTypes.string,
    name: PropTypes.string,
    profileImage: PropTypes.string,
  }),
  propertyId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  unavailableDateKeys: PropTypes.arrayOf(PropTypes.string),
  checkInDate: PropTypes.string,
  setCheckInDate: PropTypes.func,
  checkOutDate: PropTypes.string,
  setCheckOutDate: PropTypes.func,
  showMessageHost: PropTypes.bool,
  setShowMessageHost: PropTypes.func,
  isLoading: PropTypes.bool,
};

export default BookingContainer;
