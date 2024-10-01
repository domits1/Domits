import { useState, useEffect } from 'react';

const useOptionVisibility = (id) => {
  const [isRegistrationNumberRequired, setIsRegistrationNumberRequired] = useState(false);
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRegistrationNumberRequired = async (id) => {
    try {
      const response = await fetch(`https://236k9o88ek.execute-api.eu-north-1.amazonaws.com/default/registationnumberRequired/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setIsRegistrationNumberRequired(data.success);
      console.log(data.body);
      setCity(data.city);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchRegistrationNumberRequired(id);
    }
  }, [id]);

  return { isRegistrationNumberRequired, city ,loading, error };
};

export default useOptionVisibility;
