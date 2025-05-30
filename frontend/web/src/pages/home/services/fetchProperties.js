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

export const FetchPropertyType = async (type) => {  const response = await fetch(
    `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/byType?type=${type}`);
  if (!response.ok) {
    throw new Error(
      `Something went wrong while fetching PropertyType: ${response}`,
    );
  }
  return await response.json();
};
