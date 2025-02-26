export const startVerificationAPI = async (userData) => {
  const url =
      "https://xjj8u4jhec.execute-api.eu-north-1.amazonaws.com/default/UsersVerification";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: userData.userId,
      firstName: userData.firstName,
      lastName: userData.lastName,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to start verification");
  }

  return await response.json();
};

export const getIfRegistrationNumberIsRequired = async (Address) => {
  const url = `https://236k9o88ek.execute-api.eu-north-1.amazonaws.com/default/registationnumberRequired`;
  const requestBody = {
    city: Address.city,
    country: Address.country,
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

export const getVerificationStatusFromDB = async (userId) => {
  const response = await fetch(
      `https://vfn76mesc0.execute-api.eu-north-1.amazonaws.com/default/verificationStatus/${userId}`
  );

  if (!response.ok) {
    const error = new Error(`Failed to fetch verification status`);
    error.statusCode = response.status;
    throw error;
  }
  return await response.json();
};

export const sendVerificationCode = async (userData) => {
  const url = `https://obelqn0ybk.execute-api.eu-north-1.amazonaws.com/default/generateAndSendVerificationCode`;
  const requestBody = {
    userId: userData.userId,
    phoneNumber: userData.phoneNumber,
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

export const verifyCode = async (userData) => {
  const url = `https://2qbtx8dx14.execute-api.eu-north-1.amazonaws.com/default/verifyVerificationCode`;
  const requestBody = {
    userId: userData.userId,
    verificationCode: userData.code,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  if (!response.ok) {
    const errorData = await response.json();
    const errorMessage = errorData.message || "Failed to verify code";
    throw new Error(errorMessage);
  }

  return await response.json();
};

export const getPhoneNumberVerificationStatus = async (userId) => {
  const url = `https://zbw0nwjyqk.execute-api.eu-north-1.amazonaws.com/default/getIfUserPhoneNumbersIsVerifiedByUserId?userId=${encodeURIComponent(userId)}`;

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("404: Not Found");
    }
    throw new Error("Failed to fetch phone number verification status");
  }

  const data = await response.json();
  return data; // Return the parsed JSON response
};
