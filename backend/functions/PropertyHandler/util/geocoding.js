const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

/**
 * Best-effort geocoding of a property address via OpenStreetMap Nominatim.
 * Returns { latitude, longitude } or null — never throws, so a geocoding
 * failure can never break property creation. Coordinates are required by
 * external integrations such as PriceLabs; when null, those integrations
 * fall back to a dummy location.
 */
export async function geocodeAddress({ street, houseNumber, postalCode, city, country } = {}) {
  const addressLine = [street, houseNumber].filter(Boolean).join(" ");
  const parts = [addressLine, postalCode, city, country].filter(Boolean);
  if (!parts.length) return null;

  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(parts.join(", "))}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Domits/1.0 (teamdomits@gmail.com)" },
    });
    if (!res.ok) {
      console.error(`[Geocoding] Nominatim returned ${res.status}`);
      return null;
    }
    const results = await res.json();
    const hit = Array.isArray(results) ? results[0] : null;
    if (!hit?.lat || !hit?.lon) {
      // Retry once with a coarser query (postal code + city + country) when the
      // exact street address is not found.
      const coarse = [postalCode, city, country].filter(Boolean);
      if (coarse.length && coarse.length < parts.length) {
        return geocodeAddress({ postalCode, city, country });
      }
      return null;
    }
    return { latitude: Number(hit.lat), longitude: Number(hit.lon) };
  } catch (err) {
    console.error("[Geocoding] failed:", err.message);
    return null;
  }
}
