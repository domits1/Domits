import { useState } from "react";

function useAddRegistrationNumber() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const addRegistrationNumber = async (id, registrationNumber) => {
    setLoading(true);
    const url = `https://3wkzdeapea.execute-api.eu-north-1.amazonaws.com/default/addRegistrationNumber/${id}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ registrationNumber: registrationNumber.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to add registration number"
        );
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message);
      console.error("Error adding registration number:", err);
    } finally {
      setLoading(false);
    }
  };

  return { addRegistrationNumber, loading, error };
}

export default useAddRegistrationNumber;
