const PROPERTIES_API_URL =
  process.env.PROPERTIES_API_URL ||
  "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/all";

export const fetchProperties = async (lastEvaluatedKeyCreatedAt, lastEvaluatedKeyId) => {
  try {
    const url = new URL(PROPERTIES_API_URL);
    if (lastEvaluatedKeyCreatedAt) url.searchParams.set("lastEvaluatedKeyCreatedAt", lastEvaluatedKeyCreatedAt);
    if (lastEvaluatedKeyId) url.searchParams.set("lastEvaluatedKeyId", lastEvaluatedKeyId);

    const response = await fetch(url.toString());
    const raw = await response.json();
    return {
      properties: raw.properties ?? [],
      lastEvaluatedKey: raw.lastEvaluatedKey ?? null,
    };
  } catch (err) {
    console.error("error fetching properties:", err);
    throw new Error("failed to fetch properties");
  }
};
