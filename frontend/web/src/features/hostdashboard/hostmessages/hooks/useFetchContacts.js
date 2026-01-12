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

      const fetchUserInfo = async (userId) => {
        const userResponse = await fetch(
          "https://gernw0crt3.execute-api.eu-north-1.amazonaws.com/default/GetUserInfo",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ UserId: userId }),
          }
        );

        if (!userResponse.ok) {
          throw new Error("Failed to fetch user information");
        }

        const userData = await userResponse.json();
        const parsedData = JSON.parse(userData.body)[0];

        const attributes = parsedData.Attributes.reduce((acc, attribute) => {
          acc[attribute.Name] = attribute.Value;
          return acc;
        }, {});

        return {
          givenName: attributes["given_name"],
          userId: parsedData.Attributes[2].Value,
        };
      };

      const fetchLatestMessage = async (recipientIdToSend) => {
        try {
          const threadId1 = `${userId}-${recipientIdToSend}`;
          const threadId2 = `${recipientIdToSend}-${userId}`;
          
          let unifiedResponse = await fetch("https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/messages", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (!unifiedResponse.ok) {
            unifiedResponse = await fetch(`https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/messages?threadId=${threadId1}`, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            });
          }

          if (!unifiedResponse.ok) {
            unifiedResponse = await fetch(`https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/messages?threadId=${threadId2}`, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            });
          }

          if (unifiedResponse.ok) {
            const messages = await unifiedResponse.json();
            if (messages && messages.length > 0) {
              const latestMessage = messages[messages.length - 1];
              return {
                text: latestMessage.content,
                createdAt: new Date(latestMessage.createdAt).toISOString(),
                isAutomated: latestMessage.metadata?.isAutomated || false,
              };
            }
          }
        } catch (unifiedError) {
          console.warn("Failed to fetch from UnifiedMessaging:", unifiedError);
        }

        return null;
      };

      let unifiedContacts = [];
      try {
        const threadsResponse = await fetch(`https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/threads?userId=${userId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        
        if (threadsResponse.ok) {
          const threadsData = await threadsResponse.json();
          const threads = Array.isArray(threadsData) ? threadsData : [];
          
          unifiedContacts = threads
          .filter(thread => {
            return thread.hostId !== thread.guestId;
          })
          .map(thread => ({
            userId: isHost ? thread.guestId : thread.hostId,
            hostId: thread.hostId,
            Status: "accepted",
            AccoId: thread.propertyId,
            threadId: thread.id,
            isFromUnified: true
          }))
          .filter((contact, index, self) => {
            return index === self.findIndex(c => c.userId === contact.userId);
          });
          
          console.log("Found unified contacts:", unifiedContacts);
        }
      } catch (error) {
        console.warn("Failed to fetch unified threads:", error);
      }

      if (unifiedContacts.length > 0) {
        const fetchUserInfoForContacts = async (contacts, idField) => {
          return await Promise.all(
            contacts.map(async (contact) => {
              const recipientId = contact[idField];
              const userInfo = await fetchUserInfo(recipientId);
              const latestMessage = await fetchLatestMessage(recipientId);

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
              } catch (error) {
                console.warn("Failed to fetch booking or accommodation", error);
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

      console.log("No unified contacts found, trying legacy system...");
      
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
        throw new Error("Failed to fetch host contacts");
      }

      const responseData = await response.json();
      const JSONData = JSON.parse(responseData.body);
      
      const fetchUserInfoForContacts = async (contacts, idField) => {
        return await Promise.all(
          contacts.map(async (contact) => {
            const recipientId = contact[idField];
            const userInfo = await fetchUserInfo(recipientId);
            const latestMessage = await fetchLatestMessage(recipientId);

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
            } catch (error) {
              console.warn("Failed to fetch booking or accommodation", error);
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

      const acceptedContacts = await fetchUserInfoForContacts(JSONData.accepted, isHost ? "userId" : "hostId");

      const filteredPending = isHost
        ? JSONData.pending.filter((contact) => contact.userId !== userId)
        : JSONData.pending;

      const pendingContacts = await fetchUserInfoForContacts(filteredPending, isHost ? "userId" : "hostId");

      setContacts(acceptedContacts);
      setPendingContacts(pendingContacts);
    } catch (error) {
      setError("Error fetching contacts: " + error.message);
      console.error("Error fetching contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  return { contacts, pendingContacts, loading, error, setContacts };
};

export default useFetchContacts;
