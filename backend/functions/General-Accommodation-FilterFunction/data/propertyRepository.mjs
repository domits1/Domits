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

const fetchAllPropertiesUncached = async () => {
  const all = [];
  let key = null;

  do {
    const { properties, lastEvaluatedKey } = await fetchProperties(key?.createdAt, key?.id);
    all.push(...properties);
    key = lastEvaluatedKey;
  } while (key);

  return all;
};

// In-memory catalog cache, scoped to the warm Lambda container. Filtering pulls
// the full catalog on every request, so without this each invocation re-walks
// every page sequentially. The cache is bounded by CATALOG_CACHE_TTL_MS so newly
// added/edited properties surface within the TTL window.
const CATALOG_CACHE_TTL_MS = Number(process.env.CATALOG_CACHE_TTL_MS ?? 60_000);

let cachedProperties = null;
let cacheExpiresAt = 0;
let inFlight = null;

export const fetchAllProperties = async () => {
  const now = Date.now();

  if (cachedProperties && now < cacheExpiresAt) {
    return cachedProperties;
  }

  // Dedupe concurrent cold fetches so a burst of requests triggers a single
  // catalog download instead of one per request.
  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    try {
      const properties = await fetchAllPropertiesUncached();
      cachedProperties = properties;
      cacheExpiresAt = Date.now() + CATALOG_CACHE_TTL_MS;
      return properties;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
};
