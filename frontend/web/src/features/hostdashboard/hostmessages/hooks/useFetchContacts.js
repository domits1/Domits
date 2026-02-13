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
      const isHost = role === "host";

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
          } catch (e) {
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
        } catch (e) {
          return { givenName: "Unknown", userId: targetUserId };
        }
      };

      const fetchLatestMessage = async (recipientIdToSend) => {
        try {
          const threadId1 = `${userId}-${recipientIdToSend}`;
          const threadId2 = `${recipientIdToSend}-${userId}`;

          let unifiedResponse = await fetch(
            "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/messages",
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            }
          );

          if (!unifiedResponse.ok) {
            unifiedResponse = await fetch(
              `https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/messages?threadId=${threadId1}`,
              { method: "GET", headers: { "Content-Type": "application/json" } }
            );
          }

          if (!unifiedResponse.ok) {
            unifiedResponse = await fetch(
              `https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/messages?threadId=${threadId2}`,
              { method: "GET", headers: { "Content-Type": "application/json" } }
            );
          }

          if (unifiedResponse.ok) {
            const messages = await unifiedResponse.json();
            if (Array.isArray(messages) && messages.length > 0) {
              const latestMessage = messages[messages.length - 1];

              let metadata = latestMessage?.metadata || {};
              if (typeof metadata === "string") {
                try {
                  metadata = JSON.parse(metadata);
                } catch (e) {
                  metadata = {};
                }
              }

              return {
                text: latestMessage?.content || latestMessage?.text || "",
                createdAt: new Date(latestMessage?.createdAt || Date.now()).toISOString(),
                isAutomated: metadata?.isAutomated || false,
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
            .filter((t) => t?.hostId && t?.guestId && t.hostId !== t.guestId)
            .map((t) => ({
              userId: isHost ? t.guestId : t.hostId,
              hostId: t.hostId,
              Status: "accepted",
              AccoId: t.propertyId,
              threadId: t.id,
              isFromUnified: true,
            }))
            .filter((c, i, self) => i === self.findIndex((x) => x.userId === c.userId));
        }
      } catch (e) {
        console.warn("Failed to fetch unified threads:", e);
      }

      const fetchUserInfoForContacts = async (contactsList, idField) => {
        const safeContacts = Array.isArray(contactsList) ? contactsList : [];
        return await Promise.all(
          safeContacts.map(async (contact) => {
            const recipientId = contact?.[idField] || contact?.userId || contact?.hostId;

            const userInfo = recipientId
              ? await fetchUserInfo(recipientId)
              : { givenName: "Unknown", userId: null };

            const latestMessage = recipientId ? await fetchLatestMessage(recipientId) : null;

            const hostId = role === "host" ? userId : contact.hostId;
            const guestId = role === "host" ? contact.userId : userId;

            let accoImage = null;
            let bookingStatus = null;
            let arrivalDate = null;
            let departureDate = null;
            let propertyId = contact?.AccoId || null;
            let propertyTitle = null;

            try {
              const bookingInfo = await fetchBookingDetailsAndAccommodation({
                hostId,
                guestId,
                withAuth: role !== "guest",
                accommodationEndpoint:
                  role === "guest" ? "bookingEngine/listingDetails" : "hostDashboard/single",
              });

              accoImage = bookingInfo?.accoImage || null;
              bookingStatus = bookingInfo?.bookingStatus || null;
              arrivalDate = bookingInfo?.arrivalDate || null;
              departureDate = bookingInfo?.departureDate || null;
              propertyId = bookingInfo?.propertyId || propertyId;
              propertyTitle = bookingInfo?.propertyTitle || null;
            } catch (e) {
              console.warn("Failed to fetch booking/accommodation:", e);
            }

            return {
              ...(contact || {}),
              ...(userInfo || {}),
              latestMessage,
              recipientId,
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
        const acceptedContacts = await fetchUserInfoForContacts(unifiedContacts, isHost ? "userId" : "hostId");
        setContacts(acceptedContacts);
        setPendingContacts([]);
        return;
      }

      const requestData = isHost ? { hostID: userId } : { userID: userId };
      const endpoint = isHost
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
      } catch (e) {
        JSONData = { accepted: [], pending: [] };
      }

      const acceptedRaw = Array.isArray(JSONData?.accepted) ? JSONData.accepted : [];
      const pendingRaw = Array.isArray(JSONData?.pending) ? JSONData.pending : [];

      const acceptedContacts = await fetchUserInfoForContacts(acceptedRaw, isHost ? "userId" : "hostId");

      const filteredPending = isHost ? pendingRaw.filter((c) => c?.userId !== userId) : pendingRaw;
      const pendingContactsRes = await fetchUserInfoForContacts(filteredPending, isHost ? "userId" : "hostId");

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