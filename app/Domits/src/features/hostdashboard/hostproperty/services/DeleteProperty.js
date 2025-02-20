import RetrieveSessionTokens from '../../../auth/RetrieveAccessToken';

const DeleteProperty = async () => {
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
        id: 'f9ede23a-eb24-448a-9da4-8ecd4d51fffa',
        images: {
          image5:
            'https://accommodation.s3.eu-north-1.amazonaws.com/images/b4414e1f-2cef-489e-a397-de81ee3f54ec/f9ede23a-eb24-448a-9da4-8ecd4d51fffa/detail/Image-5.jpg',
          image3:
            'https://accommodation.s3.eu-north-1.amazonaws.com/images/b4414e1f-2cef-489e-a397-de81ee3f54ec/f9ede23a-eb24-448a-9da4-8ecd4d51fffa/detail/Image-3.jpg',
          image4:
            'https://accommodation.s3.eu-north-1.amazonaws.com/images/b4414e1f-2cef-489e-a397-de81ee3f54ec/f9ede23a-eb24-448a-9da4-8ecd4d51fffa/detail/Image-4.jpg',
          image1:
            'https://accommodation.s3.eu-north-1.amazonaws.com/images/b4414e1f-2cef-489e-a397-de81ee3f54ec/f9ede23a-eb24-448a-9da4-8ecd4d51fffa/detail/Image-1.jpg',
          image2:
            'https://accommodation.s3.eu-north-1.amazonaws.com/images/b4414e1f-2cef-489e-a397-de81ee3f54ec/f9ede23a-eb24-448a-9da4-8ecd4d51fffa/detail/Image-2.jpg',
        },
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
