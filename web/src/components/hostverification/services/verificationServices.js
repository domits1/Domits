export const startVerificationAPI = async (userId) => {
    const url =
      "https://xjj8u4jhec.execute-api.eu-north-1.amazonaws.com/default/UsersVerification";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    });
  
    const data = await response.json();
    console.log('API response:', data);
  
    if (!response.ok) {
      throw new Error("Failed to start verification");
    }
  
    return data;
  };
  
  export const getIfRegistrationNumberIsRequired = async (Address) => {
    const url = `https://236k9o88ek.execute-api.eu-north-1.amazonaws.com/default/registationnumberRequired`;
    const requestBody = {
      city: Address.City,
      country: Address.Country,
    };
  
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
      throw new Error("Failed to fetch accommodation data");
    }
  
    return await response.json();
  };
  