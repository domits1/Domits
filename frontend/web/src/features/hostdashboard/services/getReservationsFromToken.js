const resolveHostBookingsUrl = () => {
  const configuredEndpoint = String(
    process.env.REACT_APP_HOST_BOOKINGS_ENDPOINT ||
      process.env.REACT_APP_BOOKINGS_API_BASE ||
      ""
  ).trim();
  if (!configuredEndpoint) {
    return "";
  }

  let url;
  try {
    url = new URL(configuredEndpoint);
  } catch {
    return "";
  }
  url.searchParams.set("readType", "hostId");
  return url.toString();
};

const getReservationsFromToken = async (token) => {
  const hostBookingsUrl = resolveHostBookingsUrl();
  if (!hostBookingsUrl) {
    return "Data not found";
  }

  const response = await fetch(hostBookingsUrl, {
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
