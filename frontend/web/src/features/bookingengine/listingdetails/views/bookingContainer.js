import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import DateSelectionContainer from "./dateSelectionContainer";
import GuestSelectionContainer from "./guestSelectionContainer";
import Pricing from "../components/pricing";
import useHandleReservePress from "../hooks/handleReservePress";
import {
  buildUnavailableDateSet,
  getFutureDateKey,
  hasUnavailableDateInStayRange,
  isUnavailableDate,
} from "../utils/dateAvailability";

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
      const matches = list.filter((t) => {
        const isMatch =
          ((t?.hostId === hostId && t?.guestId === userId) || (t?.hostId === userId && t?.guestId === hostId)) &&
          String(t?.propertyId || "") === String(propertyId || "");
        return isMatch;
      });

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

        if (!res.ok) throw new Error(`threads fetch failed ${res.status}`);

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
  checkInDate = getFutureDateKey(1),
  setCheckInDate = () => {},
  checkOutDate = getFutureDateKey(2),
  setCheckOutDate = () => {},
}) => {
  const [adults, setAdults] = useState(1);
  const [kids, setKids] = useState(0);

  const handleReservePress = useHandleReservePress();
  const [showMessageHost, setShowMessageHost] = useState(false);
  const unavailableDateSet = useMemo(
    () => buildUnavailableDateSet(unavailableDateKeys),
    [unavailableDateKeys]
  );
  const nights = useMemo(() => calculateNights(checkInDate, checkOutDate), [checkInDate, checkOutDate]);

  const hostId = property?.property?.hostId || property?.property?.hostID || null;
  const hostName = host?.givenName || host?.name || "Host";
  const hostImage = host?.profileImage || null;
  const resolvedPropertyId = propertyId || property?.property?.id || property?.property?.ID || null;

  useEffect(() => {
    if (!showMessageHost) return;

    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;

    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollBarWidth > 0) body.style.paddingRight = `${scrollBarWidth}px`;

    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, [showMessageHost]);

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

  return (
    <div className="booking-container">
      <h3 className="booking-title">Booking details</h3>

      <DateSelectionContainer
        checkInDate={checkInDate}
        setCheckInDate={handleCheckInDateChange}
        checkOutDate={checkOutDate}
        setCheckOutDate={handleCheckOutDateChange}
      />

      <br />

      <GuestSelectionContainer setAdultsParent={setAdults} setKidsParent={setKids} />

      <br />

      <button
        className="reserve-btn"
        disabled={adults < 1 || nights < 1}
        onClick={() => {
          handleReservePress(
            property.property.id,
            new Date(checkInDate).getTime(),
            new Date(checkOutDate).getTime(),
            adults + kids
          );
        }}>
        Reserve
      </button>

      <p className="note">*You won’t be charged yet</p>

      <button className="message-host-btn" disabled={!hostId} onClick={() => setShowMessageHost(true)}>
        Message host
      </button>

      <hr />

      <Pricing pricing={property.pricing} nights={nights} />

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
    property: PropTypes.shape({
      hostId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      hostID: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      ID: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
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
};

export default BookingContainer;
