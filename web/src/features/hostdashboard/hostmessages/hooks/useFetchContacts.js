import { useState, useEffect } from 'react';

const useFetchContacts = (userId) => {
  const [contacts, setContacts] = useState([]);
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
      setContacts(JSONData.accepted);
    } catch (error) {
      setError('Error fetching host contacts: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return { contacts, loading, error };
};

export default useFetchContacts;
