export const FetchAllPropertyTypes = async (lastEvaluatedKeyCreatedAt, lastEvaluatedKeyId) => {
  const propertyApiBase =
    process.env.REACT_APP_PROPERTY_API_BASE ??
    'https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property';
  const baseUrl = `${propertyApiBase}/bookingEngine/all`;
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
  const propertyApiBase =
    process.env.REACT_APP_PROPERTY_API_BASE ??
    'https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property';
  const encodedType = encodeURIComponent(type ?? '');
  const url = `${propertyApiBase}/bookingEngine/byType?type=${encodedType}`;
  const response = await fetch(url);
  if (!response.ok) {
    let details = '';
    try {
      const text = await response.text();
      details = text?.slice(0, 500);
    } catch (_) { /* ignore */ }
    throw new Error(`Something went wrong while fetching PropertyType: ${response.status} ${response.statusText}${details ? ` - ${details}` : ''}`);
  }
  return await response.json();
};
