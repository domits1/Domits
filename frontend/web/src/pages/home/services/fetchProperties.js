export const FetchAllPropertyTypes = async (lastEvaluatedKeyCreatedAt, lastEvaluatedKeyId) => {
  const baseUrl = 'https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/all';
  const params = new URLSearchParams();
  if (lastEvaluatedKeyCreatedAt) params.set('lastEvaluatedKeyCreatedAt', lastEvaluatedKeyCreatedAt);
  if (lastEvaluatedKeyId) params.set('lastEvaluatedKeyId', lastEvaluatedKeyId);

  const url = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;

  const response = await fetch(url);
  if (!response.ok) {
    let details = '';
    try {
      const text = await response.text();
      details = text?.slice(0, 500);
    } catch (_) { /* ignore */ }
    throw new Error(`Something went wrong while fetching AllPropertyTypes: ${response.status} ${response.statusText}${details ? ` - ${details}` : ''}`);
  }
  return await response.json();
};

export const FetchPropertyType = async (type) => {
  const encodedType = encodeURIComponent(type ?? "");
  const url = `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/byType?type=${encodedType}`;

  try {
    const response = await fetch(url);
    
    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      let details = "";
      try {
        const text = await response.text();
        details = text?.slice(0, 500);
      } catch (_) {}
      throw new Error(
        `Something went wrong while fetching PropertyType: ${response.status} ${response.statusText}${
          details ? ` - ${details}` : ""
        }`
      );
    }

    return await response.json();
  } catch (e) {
    console.error("Unexpected error while fetching PropertyType:", e);
    return [];
  }
};
