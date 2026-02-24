import { useState, useEffect } from "react";
import fetchBookingDetailsAndAccommodation from "../utils/FetchBookingDetails";

const useFetchContacts = (userId, role) => {
  const [contacts, setContacts] = useState([]);
  const [pendingContacts, setPendingContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userId) fetchContacts();
    else {
      setContacts([]);
      setPendingContacts([]);
    }
  }, [userId, role]);

  const fetchContacts = async () => {
    setLoading(true);
    setError(null);

    try {
      const fetchUserInfo = async (targetUserId) => {
        try {
          const userResponse = await fetch(
            "https://gernw0crt3.execute-api.eu-north-1.amazonaws.com/default/GetUserInfo",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ UserId: targetUserId }),
            }
          );

          if (!userResponse.ok) {
            return { givenName: "Unknown", userId: targetUserId };
          }

          const userData = await userResponse.json();

          let parsed = null;
          try {
            parsed = typeof userData?.body === "string" ? JSON.parse(userData.body) : userData?.body;
          } catch {
            parsed = null;
          }

          const first = Array.isArray(parsed) ? parsed[0] : parsed;
          const attrsArr = first?.Attributes;

          if (!Array.isArray(attrsArr)) {
            return { givenName: "Unknown", userId: targetUserId };
          }

          const attributes = attrsArr.reduce((acc, attribute) => {
            if (attribute?.Name) acc[attribute.Name] = attribute.Value;
            return acc;
          }, {});

          const resolvedUserId =
            attributes["sub"] ||
            attributes["userId"] ||
            attrsArr.find((a) => a?.Name === "sub")?.Value ||
            targetUserId;

          return {
            givenName: attributes["given_name"] || attributes["name"] || "Unknown",
            userId: resolvedUserId,
          };
        } catch {
          return { givenName: "Unknown", userId: targetUserId };
        }
      };

      const fetchLatestMessage = async (threadId, fallbackRecipientId) => {
        try {
          let url = "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/messages";
          if (threadId) url += `?threadId=${encodeURIComponent(threadId)}`;

          const unifiedResponse = await fetch(url, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });

          if (unifiedResponse.ok) {
            const messages = await unifiedResponse.json();
            if (Array.isArray(messages) && messages.length > 0) {
              const latestMessage = messages[messages.length - 1];

              let metadata = latestMessage?.metadata || {};
              if (typeof metadata === "string") {
                try {
                  metadata = JSON.parse(metadata);
                } catch {
                  metadata = {};
                }
              }

              return {
                text: latestMessage?.content || latestMessage?.text || "",
                createdAt: new Date(latestMessage?.createdAt || Date.now()).toISOString(),
                isAutomated: metadata?.isAutomated || false,
                senderId: latestMessage?.senderId || latestMessage?.userId || null,
                recipientId: latestMessage?.recipientId || fallbackRecipientId || null,
                threadId: latestMessage?.threadId || threadId || null,
              };
            }
          }
        } catch (e) {
          console.warn("Failed to fetch latest message:", e);
        }
        return null;
      };

      let unifiedContacts = [];
      try {
        const threadsResponse = await fetch(
          `https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/threads?userId=${userId}`,
          { method: "GET", headers: { "Content-Type": "application/json" } }
        );

        if (threadsResponse.ok) {
          const threadsData = await threadsResponse.json();
          const threads = Array.isArray(threadsData) ? threadsData : [];

          unifiedContacts = threads
            .filter((t) => t?.hostId && t?.guestId && String(t.hostId) !== String(t.guestId))
            .map((t) => {
              let partnerId = null;
              if (String(t.hostId) === String(userId)) partnerId = t.guestId;
              else if (String(t.guestId) === String(userId)) partnerId = t.hostId;
              else {
                partnerId = role === "host" ? t.guestId : t.hostId;
              }

              return {
                partnerId,
                recipientId: partnerId,
                userId: partnerId,

                hostId: t.hostId,
                guestId: t.guestId,

                Status: "accepted",
                AccoId: t.propertyId,
                propertyId: t.propertyId,
                threadId: t.id,
                isFromUnified: true,
              };
            })
            .filter((c) => c.partnerId && String(c.partnerId) !== String(userId));
        }
      } catch (e) {
        console.warn("Failed to fetch unified threads:", e);
      }

      const hydrateContacts = async (contactsList) => {
        const safeContacts = Array.isArray(contactsList) ? contactsList : [];

        return await Promise.all(
          safeContacts.map(async (contact) => {
            const partnerId = contact?.partnerId || contact?.recipientId || contact?.userId || null;

            const userInfo = partnerId
              ? await fetchUserInfo(partnerId)
              : { givenName: "Unknown", userId: partnerId };

            const latestMessage = await fetchLatestMessage(contact?.threadId, partnerId);


            const threadHostId = contact?.hostId || null;
            const threadGuestId = contact?.guestId || null;

            let hostIdForLookup = null;
            let guestIdForLookup = null;

            if (threadHostId && threadGuestId) {

              if (String(threadHostId) === String(userId)) {
                hostIdForLookup = threadHostId;
                guestIdForLookup = threadGuestId;
              } else if (String(threadGuestId) === String(userId)) {
                hostIdForLookup = threadHostId;
                guestIdForLookup = threadGuestId;
              } else {

                hostIdForLookup = role === "guest" ? partnerId : userId;
                guestIdForLookup = role === "guest" ? userId : partnerId;
              }
            } else {

              hostIdForLookup = role === "guest" ? partnerId : userId;
              guestIdForLookup = role === "guest" ? userId : partnerId;
            }

            let accoImage = null;
            let bookingStatus = null;
            let arrivalDate = null;
            let departureDate = null;
            let propertyId = contact?.propertyId || contact?.AccoId || null;
            let propertyTitle = null;

            try {
              const bookingInfo = await fetchBookingDetailsAndAccommodation({
                hostId: hostIdForLookup,
                guestId: guestIdForLookup,
                withAuth: role !== "guest",
                accommodationEndpoint: role === "guest" ? "bookingEngine/listingDetails" : "hostDashboard/single",
              });

              accoImage = bookingInfo?.accoImage || null;
              bookingStatus = bookingInfo?.bookingStatus || null;
              arrivalDate = bookingInfo?.arrivalDate || null;
              departureDate = bookingInfo?.departureDate || null;
              propertyId = bookingInfo?.propertyId || propertyId;
              propertyTitle = bookingInfo?.propertyTitle || null;
            } catch (e) {
              // ok
            }

            return {
              ...contact,

              partnerId,
              recipientId: partnerId,
              userId: partnerId,

              givenName: userInfo?.givenName || contact?.givenName || "Unknown",
              profileImage: contact?.profileImage || null,

              latestMessage,
              accoImage,
              bookingStatus,
              arrivalDate,
              departureDate,
              propertyId,
              propertyTitle,
            };
          })
        );
      };

      if (unifiedContacts.length > 0) {
        const acceptedContacts = await hydrateContacts(unifiedContacts);
        setContacts(acceptedContacts);
        setPendingContacts([]);
        return;
      }

      const isHostLegacy = role === "host";
      const requestData = isHostLegacy ? { hostID: userId } : { userID: userId };
      const endpoint = isHostLegacy
        ? "https://d1mhedhjkb.execute-api.eu-north-1.amazonaws.com/default/FetchContacts"
        : "https://d1mhedhjkb.execute-api.eu-north-1.amazonaws.com/default/FetchContacts_Guest";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) throw new Error("Failed to fetch contacts");

      const responseData = await response.json();

      let JSONData = { accepted: [], pending: [] };
      try {
        JSONData = typeof responseData?.body === "string" ? JSON.parse(responseData.body) : responseData?.body || JSONData;
      } catch {
        JSONData = { accepted: [], pending: [] };
      }

      const acceptedRaw = Array.isArray(JSONData?.accepted) ? JSONData.accepted : [];
      const pendingRaw = Array.isArray(JSONData?.pending) ? JSONData.pending : [];

      const normalizeLegacy = (raw) => {
        const partnerId = isHostLegacy ? raw?.userId : raw?.hostId;
        return {
          ...raw,
          partnerId,
          recipientId: partnerId,
          userId: partnerId,
          hostId: raw?.hostId || (isHostLegacy ? userId : null),
          guestId: raw?.userId || (!isHostLegacy ? userId : null),
          Status: raw?.Status || raw?.status || "accepted",
        };
      };

      const acceptedContacts = await hydrateContacts(acceptedRaw.map(normalizeLegacy));

      const filteredPending = isHostLegacy ? pendingRaw.filter((c) => c?.userId !== userId) : pendingRaw;
      const pendingContactsRes = await hydrateContacts(filteredPending.map(normalizeLegacy));

      setContacts(acceptedContacts);
      setPendingContacts(pendingContactsRes);
    } catch (err) {
      setError("Error fetching contacts: " + (err?.message || String(err)));
      setContacts([]);
      setPendingContacts([]);
    } finally {
      setLoading(false);
    }
  };

  return { contacts, pendingContacts, loading, error, setContacts };
};

export default useFetchContacts;