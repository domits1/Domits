import { useState, useEffect } from 'react';

function useFetchAccommodation(id) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const fields = 'Street,PostalCode,Country,City';

  const fetchAccommodationDetails = async (id) => {
    const url = `https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/GetAccommodation/${id}?fields=${encodeURIComponent(fields)}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setData(data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (id) {
      fetchAccommodationDetails(id);
    }
  }, [id]);

  return { loading, error, data };
}

export default useFetchAccommodation;
