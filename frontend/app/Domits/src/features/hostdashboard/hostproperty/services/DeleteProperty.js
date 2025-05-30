import RetrieveAccessToken from '../../../auth/RetrieveAccessToken';

const DeleteProperty = async propertyId => {
  const accessToken = await RetrieveAccessToken();
  const response = await fetch(
    'https://hfsqawwfu0.execute-api.eu-north-1.amazonaws.com/default/DeleteAccommodation',
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: accessToken,
      },
      body: JSON.stringify({
        id: propertyId,
      }),
    },
  );
  if (!response.ok) {
    console.error(await response.json());
  }
  const responseData = await response.json();
  return responseData.body;
};
export default DeleteProperty;
