import RetrieveSessionTokens from '../../../auth/RetrieveSessionTokens';

const DeleteProperty = async () => {
  const accessToken = await RetrieveSessionTokens();
  const response = await fetch(
    'https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/ReadAccommodation',
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: accessToken,
      },
      body: JSON.stringify({
        id: '13d451eb-53b2-4d50-b1b2-3fd134bb7d8b',
        images:
          "{ 'image5' : { 'S' : 'https://accommodation.s3.eu-north-1.amazonaws.com/images/b4414e1f-2cef-489e-a397-de81ee3f54ec/13d451eb-53b2-4d50-b1b2-3fd134bb7d8b/detail/Image-5.jpg' }, 'image3' : { 'S' : 'https://accommodation.s3.eu-north-1.amazonaws.com/images/b4414e1f-2cef-489e-a397-de81ee3f54ec/13d451eb-53b2-4d50-b1b2-3fd134bb7d8b/detail/Image-3.jpg' }, 'image4' : { 'S' : 'https://accommodation.s3.eu-north-1.amazonaws.com/images/b4414e1f-2cef-489e-a397-de81ee3f54ec/13d451eb-53b2-4d50-b1b2-3fd134bb7d8b/detail/Image-4.jpg' }, 'image1' : { 'S' : 'https://accommodation.s3.eu-north-1.amazonaws.com/images/b4414e1f-2cef-489e-a397-de81ee3f54ec/13d451eb-53b2-4d50-b1b2-3fd134bb7d8b/detail/Image-1.jpg' }, 'image2' : { 'S' : 'https://accommodation.s3.eu-north-1.amazonaws.com/images/b4414e1f-2cef-489e-a397-de81ee3f54ec/13d451eb-53b2-4d50-b1b2-3fd134bb7d8b/detail/Image-2.jpg' } }",
      }),
    },
  );
  if (!response.ok) {
    console.error(await response.json());
  }
  const responseData = await response.json();
  console.log(responseData);
  return JSON.parse(responseData.body);
};

export default DeleteProperty;
