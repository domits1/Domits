import { useState, useEffect } from "react";
import { getIfRegistrationNumberIsRequired } from "../services/verificationServices";

const useIsRegistrationNumberRequired = (Address) => {
  const [isRegistrationNumberRequired, setIsRegistrationNumberRequired] =
    useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (Address && Address.City && Address.Country) {
        setLoading(true);
        try {
          const data = await getIfRegistrationNumberIsRequired(Address);
          setIsRegistrationNumberRequired(data.match);
        } catch (error) {
          setError(error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [Address]);

  return { isRegistrationNumberRequired, loading, error };
};

export default useIsRegistrationNumberRequired;
