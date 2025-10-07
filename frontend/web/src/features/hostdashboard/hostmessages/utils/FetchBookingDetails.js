import { getAccessToken } from '../../../../services/getAccessToken';

const fetchBookingDetailsAndAccommodation = async ({
  hostId,
  guestId,
  withAuth = false,
  accommodationEndpoint = '',
}) => {
  const token = withAuth ? getAccessToken(hostId) : getAccessToken(guestId);

  const bookingRes = await fetch(`https://912b02rvk4.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Read-GuestBookingDetails?hostId=${hostId}&guestId=${guestId}`);
  if (!bookingRes.ok) throw new Error('Failed to fetch booking details');

  const bookingData = await bookingRes.json();
  const arrivalDate = new Date(bookingData.arrivalDate);
  const departureDate = new Date(bookingData.departureDate);
  const bookingStatus = bookingData.status || null;
  const propertyId = bookingData.property_id || null;

  let accoImage = null;

  let propertyTitle = null;

  if (propertyId && accommodationEndpoint) {
    const accoRes = await fetch(
      `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/${accommodationEndpoint}?property=${propertyId}`,
      {
        method: 'GET',
        headers: {
          Authorization: token,
        },
      }
    );

    if (!accoRes.ok) throw new Error('Failed to fetch accommodation');

    const accoRaw = await accoRes.json();
    const key = accoRaw?.images?.[0]?.key;
    propertyTitle = accoRaw?.title || accoRaw?.name || null;

    if (key) {
      accoImage = `https://accommodation.s3.eu-north-1.amazonaws.com/${key}`;
    }
  }

  return {
    accoImage,
    bookingStatus,
    arrivalDate,
    departureDate,
    propertyId,
    propertyTitle,
  };
};

export default fetchBookingDetailsAndAccommodation;
