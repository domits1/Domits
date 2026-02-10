import { useState, useEffect } from "react";
import fetchBookingDetailsAndAccommodation from "../utils/FetchBookingDetails";

const useFetchContacts = (userId, role) => {
  const [contacts, setContacts] = useState([]);
  const [pendingContacts, setPendingContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userId) {
      fetchContacts();
    }
  }, [userId]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const isHost = role === "host";

      const fetchUserInfo = async (uId) => {
        const userResponse = await fetch("https://gernw0crt3.execute-api.eu-north-1.amazonaws.com/default/GetUserInfo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ UserId: uId }),
        });

        if (!userResponse.ok) {
          throw new Error("Failed to fetch user information");
        }

        const userData = await userResponse.json();
        const parsed = JSON.parse(userData.body);
        const first = Array.isArray(parsed) ? parsed[0] : null;

        if (!first?.Attributes) {
          return { givenName: "Unknown", userId: uId };
        }

        const attributes = first.Attributes.reduce((acc, attribute) => {
          acc[attribute.Name] = attribute.Value;
          return acc;
        }, {});

        return {
          givenName: attributes["given_name"] || "Unknown",
          userId: first.Attributes?.[2]?.Value || uId,
        };
      };

      const fetchLatestMessageByThreadId = async (threadId) => {
        if (!threadId) return null;
        try {
          const res = await fetch(
            `https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/messages?threadId=${threadId}`,
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            }
          );

          if (!res.ok) return null;

          const messages = await res.json();
          if (!Array.isArray(messages) || messages.length === 0) return null;

          const latest = messages[messages.length - 1];

          let metadata = latest?.metadata || {};
          if (typeof metadata === "string") {
            try {
              metadata = JSON.parse(metadata);
            } catch {
              metadata = {};
            }
          }

          return {
            text: latest.content || "",
            createdAt:
              typeof latest.createdAt === "number"
                ? new Date(latest.createdAt).toISOString()
                : new Date().toISOString(),
            isAutomated: metadata?.isAutomated || false,
          };
        } catch (e) {
          console.warn("Failed to fetch latest message by thread:", e);
          return null;
        }
      };

      let unifiedContacts = [];
      try {
        const threadsResponse = await fetch(
          `https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/threads?userId=${userId}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (threadsResponse.ok) {
          const threadsData = await threadsResponse.json();
          const threads = Array.isArray(threadsData) ? threadsData : [];

          unifiedContacts = threads
            .filter((thread) => thread?.hostId && thread?.guestId && thread.hostId !== thread.guestId)
            .map((thread) => ({
              userId: isHost ? thread.guestId : thread.hostId,
              hostId: thread.hostId,
              Status: "accepted",
              AccoId: thread.propertyId,
              threadId: thread.id,
              isFromUnified: true,
            }))
            .filter((contact, index, self) => index === self.findIndex((c) => c.userId === contact.userId));
        }
      } catch (e) {
        console.warn("Failed to fetch unified threads:", e);
      }

      if (unifiedContacts.length > 0) {
        const fetchUserInfoForContacts = async (contactsArr, idField) => {
          return await Promise.all(
            contactsArr.map(async (contact) => {
              const recipientId = contact[idField];
              const userInfo = await fetchUserInfo(recipientId);
              const latestMessage = await fetchLatestMessageByThreadId(contact.threadId);

              const hostId = role === "host" ? userId : contact.hostId;
              const guestId = role === "host" ? contact.userId : userId;

              let accoImage = null;
              let bookingStatus = null;
              let arrivalDate = null;
              let departureDate = null;
              let propertyId = contact.AccoId;
              let propertyTitle = null;

              try {
                const bookingInfo = await fetchBookingDetailsAndAccommodation({
                  hostId,
                  guestId,
                  withAuth: role !== "guest",
                  accommodationEndpoint: role === "guest" ? "bookingEngine/listingDetails" : "hostDashboard/single",
                });

                accoImage = bookingInfo.accoImage;
                bookingStatus = bookingInfo.bookingStatus;
                arrivalDate = bookingInfo.arrivalDate || null;
                departureDate = bookingInfo.departureDate || null;
                propertyId = bookingInfo.propertyId || propertyId;
                propertyTitle = bookingInfo.propertyTitle || null;
              } catch (e) {
                console.warn("Failed to fetch booking or accommodation", e);
              }

              return {
                ...contact,
                ...userInfo,
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

        const acceptedContacts = await fetchUserInfoForContacts(unifiedContacts, isHost ? "userId" : "hostId");

        setContacts(acceptedContacts);
        setPendingContacts([]);
        setLoading(false);
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

      if (!response.ok) {
        throw new Error("Failed to fetch contacts");
      }

      const responseData = await response.json();
      const JSONData = JSON.parse(responseData.body);

      const fetchUserInfoForContacts = async (contactsArr, idField) => {
        return await Promise.all(
          contactsArr.map(async (contact) => {
            const recipientId = contact[idField];
            const userInfo = await fetchUserInfo(recipientId);

            const hostId = role === "host" ? userId : contact.hostId;
            const guestId = role === "host" ? contact.userId : userId;

            let accoImage = null;
            let bookingStatus = null;
            let arrivalDate = null;
            let departureDate = null;
            let propertyId = null;
            let propertyTitle = null;

            try {
              const bookingInfo = await fetchBookingDetailsAndAccommodation({
                hostId,
                guestId,
                withAuth: role !== "guest",
                accommodationEndpoint: role === "guest" ? "bookingEngine/listingDetails" : "hostDashboard/single",
              });

              accoImage = bookingInfo.accoImage;
              bookingStatus = bookingInfo.bookingStatus;
              arrivalDate = bookingInfo.arrivalDate || null;
              departureDate = bookingInfo.departureDate || null;
              propertyId = bookingInfo.propertyId || null;
              propertyTitle = bookingInfo.propertyTitle || null;
            } catch (e) {
              console.warn("Failed to fetch booking or accommodation", e);
            }

            return {
              ...contact,
              ...userInfo,
              latestMessage: null,
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

      const acceptedContacts = await fetchUserInfoForContacts(JSONData.accepted, isHost ? "userId" : "hostId");

      const filteredPending = isHost ? JSONData.pending.filter((contact) => contact.userId !== userId) : JSONData.pending;
      const pending = await fetchUserInfoForContacts(filteredPending, isHost ? "userId" : "hostId");

      setContacts(acceptedContacts);
      setPendingContacts(pending);
    } catch (e) {
      setError("Error fetching contacts: " + e.message);
      console.error("Error fetching contacts:", e);
    } finally {
      setLoading(false);
    }
  };

  return { contacts, pendingContacts, loading, error, setContacts };
};

export default useFetchContacts;
