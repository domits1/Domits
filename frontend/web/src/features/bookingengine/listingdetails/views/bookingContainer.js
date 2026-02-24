import React, { useEffect, useRef, useState } from "react";
import DateSelectionContainer from "./dateSelectionContainer";
import GuestSelectionContainer from "./guestSelectionContainer";
import Pricing from "../components/pricing";
import useHandleReservePress from "../hooks/handleReservePress";

import { UserProvider } from "../../../hostdashboard/hostmessages/context/AuthContext";
import { WebSocketProvider } from "../../../hostdashboard/hostmessages/context/webSocketContext";
import { useAuth } from "../../../hostdashboard/hostmessages/hooks/useAuth";
import ChatScreen from "../../../../components/messages/ChatScreen";

const UNIFIED_MESSAGING_API = "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default";

const MessageHostModalInner = ({ onClose, hostId, hostName, hostImage, propertyId }) => {
  const { userId } = useAuth();
  const [resolvedThreadId, setResolvedThreadId] = useState(null);

  const inFlightRef = useRef(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;

    const findThreadIdForListing = (threads) => {
      const list = Array.isArray(threads) ? threads : [];
      const matches = list.filter((t) => {
        const isMatch =
          ((t?.hostId === hostId && t?.guestId === userId) ||
            (t?.hostId === userId && t?.guestId === hostId)) &&
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

        if (!cancelled) {
          setResolvedThreadId(found);
        }
      } catch {
        if (!cancelled) {
          setResolvedThreadId(null);
        }
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
      <div className="message-host-modal">
        <div className="message-host-modal__backdrop" onClick={onClose} />
        <div className="message-host-modal__content">
          <div style={{ padding: 16 }}>Loading user…</div>
        </div>
      </div>
    );
  }

  return (
    <WebSocketProvider userId={userId}>
      <div className="message-host-modal" role="dialog" aria-modal="true" aria-label="Message host">
        <div className="message-host-modal__backdrop" onClick={onClose} />
        <div className="message-host-modal__content">
          <ChatScreen
            userId={userId}
            contactId={hostId}
            contactName={hostName || "Host"}
            contactImage={hostImage || null}
            threadId={resolvedThreadId}
            propertyId={propertyId || null}
            onBack={onClose}
            dashboardType="guest"
          />
        </div>
      </div>
    </WebSocketProvider>
  );
};

const BookingContainer = ({ property, host, propertyId }) => {
  const [checkInDate, setCheckInDate] = useState(new Date(Date.now() + 86400000).toISOString().split("T")[0]);
  const [checkOutDate, setCheckOutDate] = useState(new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0]);
  const [nights, setNights] = useState();
  const [adults, setAdults] = useState(1);
  const [kids, setKids] = useState(0);

  const handleReservePress = useHandleReservePress();
  const [showMessageHost, setShowMessageHost] = useState(false);

  const hostId = property?.property?.hostId || property?.property?.hostID || null;
  const hostName = host?.givenName || host?.name || "Host";
  const hostImage = host?.profileImage || null;
  const resolvedPropertyId = propertyId || property?.property?.id || property?.property?.ID || null;

  return (
    <div className="booking-container">
      <h3 className="booking-title">Booking details</h3>

      <DateSelectionContainer
        checkInDate={checkInDate}
        setCheckInDate={setCheckInDate}
        checkOutDate={checkOutDate}
        setCheckOutDate={setCheckOutDate}
        setNights={setNights}
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
        }}
      >
        Reserve
      </button>

      <p className="note">*You won’t be charged yet</p>

      <button
        className="message-host-btn"
        disabled={!hostId}
        onClick={() => setShowMessageHost(true)}
        style={{
          width: "100%",
          marginTop: 12,
          borderRadius: 12,
          padding: "12px 14px",
          fontWeight: 600,
          border: "1px solid #ddd",
          background: "#fff",
          cursor: hostId ? "pointer" : "not-allowed",
        }}
      >
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

      <style>{`
        .message-host-modal {
          position: fixed;
          inset: 0;
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .message-host-modal__backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.55);
        }
        .message-host-modal__content {
          position: relative;
          width: min(980px, 96vw);
          height: min(86vh, 920px);
          background: #fff;
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .message-host-modal__content .guest-chat,
        .message-host-modal__content .host-chat {
          height: 100%;
        }
        .message-host-modal__content .chat-screen-container {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .message-host-modal__content .chat-screen {
          flex: 1;
          min-height: 0;
          overflow: auto;
        }
        .message-host-modal__content .chat-input {
          flex-shrink: 0;
          border-top: 1px solid #eee;
          background: #fff;
        }
      `}</style>
    </div>
  );
};

export default BookingContainer;