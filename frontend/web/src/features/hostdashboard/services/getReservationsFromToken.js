const DEFAULT_HOST_BOOKINGS_ENDPOINT =
  "https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings";

const resolveHostBookingsUrl = () => {
  const configuredEndpoint =
    process.env.REACT_APP_HOST_BOOKINGS_ENDPOINT ||
    process.env.REACT_APP_BOOKINGS_API_BASE ||
    DEFAULT_HOST_BOOKINGS_ENDPOINT;
  const url = new URL(configuredEndpoint);
  url.searchParams.set("readType", "hostId");
  return url.toString();
};

const getReservationsFromToken = async (token) => {
  const response = await fetch(resolveHostBookingsUrl(), {
    headers: {
      Authorization: token,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    return "Data not found";
  }
  return data;
};

export default getReservationsFromToken;
