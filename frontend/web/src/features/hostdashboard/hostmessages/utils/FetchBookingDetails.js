import { getAccessToken } from '../../../../services/getAccessToken';
import { getGuestBookingDetails, getAccommodationByPropertyId } from '../services/messagingService';

const fetchBookingDetailsAndAccommodation = async ({
  hostId,
  guestId,
  withAuth = false,
  accommodationEndpoint = '',
}) => {
  const token = withAuth ? getAccessToken(hostId) : getAccessToken(guestId);

  const bookingData = await getGuestBookingDetails(hostId, guestId);
  const arrivalDate = new Date(bookingData.arrivalDate);
  const departureDate = new Date(bookingData.departureDate);
  const bookingStatus = bookingData.status || null;
  const propertyId = bookingData.property_id || null;

  let accoImage = null;

  if (bookingData.property_id && accommodationEndpoint) {
    const accoRaw = await getAccommodationByPropertyId(accommodationEndpoint, bookingData.property_id, token);
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
