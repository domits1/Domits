import { useState, useEffect } from 'react';

const useIsRegistrationNumberRequired = (Address) => {
  const [isRegistrationNumberRequired, setIsRegistrationNumberRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRegistrationNumberRequired = async (id) => {
    const url = `https://236k9o88ek.execute-api.eu-north-1.amazonaws.com/default/registationnumberRequired`;
    const requestBody = {
      city: Address.City,
      country: Address.Country,
    };
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setIsRegistrationNumberRequired(data.match);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Address && Address.City && Address.Country) {
      setLoading(true);
      fetchRegistrationNumberRequired(Address);
    }
  }, [Address]);


  return { isRegistrationNumberRequired, loading, error };
};

export default useIsRegistrationNumberRequired;
