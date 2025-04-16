async function FetchProperties(lastEvaluatedKeyCreatedAt, lastEvaluatedKeyId) {
  try {
    const response = await fetch(
      `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/all?lastEvaluatedKeyStatus=ACTIVE&lastEvaluatedKeyCreatedAt=${lastEvaluatedKeyCreatedAt}&lastEvaluatedKeyId=${lastEvaluatedKeyId}`,
    );
    return await response.json();
  } catch (error) {
    console.error(error);
  }
}

export default FetchProperties;
