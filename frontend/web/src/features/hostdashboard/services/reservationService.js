const BOOKINGS_API_URL =
  "https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings";

export const updateInquiryStatus = async (bookingId, action, token) => {
  const response = await fetch(BOOKINGS_API_URL, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify({ action, bookingId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update inquiry status: ${response.status}`);
  }

  return response.json();
};
