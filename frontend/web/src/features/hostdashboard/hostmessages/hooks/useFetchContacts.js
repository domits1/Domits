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

      let unifiedThreads = [];
      try {
        const threadsResponse = await fetch(`https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/threads?userId=${userId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        
        if (threadsResponse.ok) {
          const threadsData = await threadsResponse.json();
          unifiedThreads = Array.isArray(threadsData) ? threadsData : [];
        }
      } catch (error) {
        console.warn("Failed to fetch unified threads:", error);
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
        throw new Error("Failed to fetch host contacts");
      }

      const responseData = await response.json();
      const JSONData = JSON.parse(responseData.body);
      
      const unifiedContacts = unifiedThreads.map(thread => ({
        userId: isHost ? thread.guestId : thread.hostId,
        hostId: thread.hostId,
        Status: "accepted",
        AccoId: thread.propertyId,
        isFromUnified: true
      }));
      
      const allAccepted = [...(JSONData.accepted || []), ...unifiedContacts];
      const uniqueAccepted = allAccepted.filter((contact, index, self) => 
        index === self.findIndex(c => c.userId === contact.userId)
      );
      
      JSONData.accepted = uniqueAccepted;

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
          const unifiedResponse = await fetch("https://lambda.eu-north-1.amazonaws.com/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Amz-Target": "AWSLambda.Invoke",
              "X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
            },
            body: JSON.stringify({
              FunctionName: "UnifiedMessaging",
              InvocationType: "RequestResponse",
              Payload: JSON.stringify({
                httpMethod: "GET",
                path: "/messages",
                queryStringParameters: {
                  senderId: userId,
                  recipientId: recipientIdToSend,
                },
              }),
            }),
          });

          if (unifiedResponse.ok) {
            const lambdaResult = await unifiedResponse.json();
            if (lambdaResult.statusCode === 200 && lambdaResult.response) {
              const messages = JSON.parse(lambdaResult.response);
              if (messages && messages.length > 0) {
                const latestMessage = messages[messages.length - 1];
                return {
                  text: latestMessage.content,
                  createdAt: new Date(latestMessage.createdAt).toISOString(),
                  isAutomated: latestMessage.metadata?.isAutomated || false,
                };
              }
            }
          }
        } catch (unifiedError) {
          console.warn("Failed to fetch from UnifiedMessaging, falling back to legacy system:", unifiedError);
        }

        const response = await fetch(
          "https://tgkskhfz79.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Read-NewMessages",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: userId,
              recipientId: recipientIdToSend,
            }),
          }
        );

        const rawResponse = await response.text();
        const result = JSON.parse(rawResponse);

        return response.ok ? result : null;
      };

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
      setError("Error fetching host contacts: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return { contacts, pendingContacts, loading, error, setContacts };
};

export default useFetchContacts;
