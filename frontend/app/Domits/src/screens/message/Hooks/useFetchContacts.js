import { useState, useEffect } from 'react';

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

      const isHost = role === 'host';

      const requestData = isHost ? { hostID: userId } : { userID: userId };
      const endpoint = isHost
        ? 'https://d1mhedhjkb.execute-api.eu-north-1.amazonaws.com/default/FetchContacts'
        : 'https://d1mhedhjkb.execute-api.eu-north-1.amazonaws.com/default/FetchContacts_Guest';


      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch host contacts');
      }

      const responseData = await response.json();
      const JSONData = JSON.parse(responseData.body);

      const fetchUserInfo = async (userId) => {
        const userResponse = await fetch('https://gernw0crt3.execute-api.eu-north-1.amazonaws.com/default/GetUserInfo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ UserId: userId }),
        });

        if (!userResponse.ok) {
          throw new Error('Failed to fetch user information');
        }

        const userData = await userResponse.json();
        const parsedData = JSON.parse(userData.body)[0];

        const attributes = parsedData.Attributes.reduce((acc, attribute) => {
          acc[attribute.Name] = attribute.Value;
          return acc;
        }, {});

        return {
          givenName: attributes['given_name'],
          userId: parsedData.Attributes[2].Value,
        };
      };

      const fetchLatestMessage = async (recipientIdToSend) => {
        const response = await fetch('https://tgkskhfz79.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Read-NewMessages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userId,
            recipientId: recipientIdToSend,
          }),
        });

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
            return {
              ...contact,
              ...userInfo,
              latestMessage,
              recipientId,
            };
          })
        );
      };

      const acceptedContacts = await fetchUserInfoForContacts(
        JSONData.accepted,
        isHost ? 'userId' : 'hostId'
      );

      const filteredPending = isHost
        ? JSONData.pending.filter((contact) => contact.userId !== userId)
        : JSONData.pending;

      const pendingContacts = await fetchUserInfoForContacts(
        filteredPending,
        isHost ? 'userId' : 'hostId'
      );

      setContacts(acceptedContacts);
      setPendingContacts(pendingContacts);
    } catch (error) {
      setError('Error fetching host contacts: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return { contacts, pendingContacts, loading, error, setContacts };
};

export default useFetchContacts;
