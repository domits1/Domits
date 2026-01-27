export const FetchAllPropertyTypes = async (lastEvaluatedKeyCreatedAt, lastEvaluatedKeyId) => {
  const response = await fetch(
      `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/all?lastEvaluatedKeyCreatedAt=${lastEvaluatedKeyCreatedAt}&lastEvaluatedKeyId=${lastEvaluatedKeyId}`);
  if (!response.ok) {
    throw new Error(
      `Something went wrong while fetching AllPropertyTypes: ${response}`,
    );
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
