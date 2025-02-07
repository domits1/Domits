import { useState, useEffect } from 'react';

const useFetchContacts = (userId) => {
  const [contacts, setContacts] = useState([]);
  const [pendingContacts, setPendingContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userId) {
      fetchHostContacts();
    }
  }, [userId]);

  const fetchHostContacts = async () => {
    setLoading(true);
    try {
      const requestData = { hostID: userId };
      const response = await fetch('https://d1mhedhjkb.execute-api.eu-north-1.amazonaws.com/default/FetchContacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch host contacts');
      }

      const responseData = await response.json();
      const JSONData = JSON.parse(responseData.body);

      const fetchUserInfoForContacts = async (contacts) => {
        const contactDetails = await Promise.all(contacts.map(async (contact) => {
          const userInfo = await fetchUserInfo(contact.userId);
          const latestMessage = await fetchLatestMessage(contact.userId);
          return { ...contact, ...userInfo, latestMessage, recipientId: contact.userId, };
        }));
        return contactDetails;
      };

      const fetchUserInfo = async (userId) => {
        const requestData = { UserId: userId };
        const userResponse = await fetch('https://gernw0crt3.execute-api.eu-north-1.amazonaws.com/default/GetUserInfo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData),
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

        if (response.ok) {
          return result;
        }
        return null;
      };

      const acceptedContacts = await fetchUserInfoForContacts(
        JSONData.accepted.filter(contact => contact.userId !== userId)
      );
      const pendingContacts = await fetchUserInfoForContacts(
        JSONData.pending.filter(contact => contact.userId !== userId)
      );

      setContacts(acceptedContacts);
      setPendingContacts(pendingContacts);
    } catch (error) {
      setError('Error fetching host contacts: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return { contacts, pendingContacts, loading, error };
};

export default useFetchContacts;
