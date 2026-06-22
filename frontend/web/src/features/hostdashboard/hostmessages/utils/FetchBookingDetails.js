import { getAccessToken } from '../../../../services/getAccessToken';
import {
  getAccommodationByPropertyId,
  getBookingPropertyId,
  getGuestBookingDetailsByBookingId,
} from '../services/messagingService';
import { resolvePrimaryAccommodationImageUrl } from '../../../../utils/accommodationImage';

const toDateOrNull = (value) => {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  const date = Number.isFinite(numeric) ? new Date(numeric) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const resolvePropertyTitle = (accoRaw) =>
  accoRaw?.property?.title || accoRaw?.property?.name || accoRaw?.title || accoRaw?.name || null;

const fetchBookingDetailsAndAccommodation = async ({
  hostId,
  guestId,
  bookingId = null,
  propertyId = null,
  token = null,
  withAuth = false,
  accommodationEndpoint = '',
}) => {
  const authToken = token || (withAuth ? getAccessToken(hostId) : getAccessToken(guestId));

  if (!authToken) {
    throw new Error("Authentication token is required.");
  }

  if (withAuth || !bookingId) {
    let accoImage = null;
    let propertyTitle = null;

    if (withAuth && propertyId && accommodationEndpoint) {
      const accoRaw = await getAccommodationByPropertyId(accommodationEndpoint, propertyId, authToken);
      propertyTitle = resolvePropertyTitle(accoRaw);
      accoImage = resolvePrimaryAccommodationImageUrl(accoRaw?.images, "thumb");
    }

    return {
      accoImage,
      bookingStatus: null,
      arrivalDate: null,
      departureDate: null,
      propertyId,
      propertyTitle,
    };
  }

  const { bookingDetails: bookingData, accommodation: accoRaw } = await getGuestBookingDetailsByBookingId({
    bookingId,
    guestId,
    token: authToken,
  });
  const arrivalDate = toDateOrNull(bookingData.arrivalDate || bookingData.arrivaldate);
  const departureDate = toDateOrNull(bookingData.departureDate || bookingData.departuredate);
  const bookingStatus = bookingData.status || null;
  const resolvedPropertyId = getBookingPropertyId(bookingData);

  let accoImage = null;
  let propertyTitle = null;

  if (resolvedPropertyId && accommodationEndpoint) {
    propertyTitle = resolvePropertyTitle(accoRaw);
    accoImage = resolvePrimaryAccommodationImageUrl(accoRaw?.images, "thumb");
  }

  return {
    accoImage,
    bookingStatus,
    arrivalDate,
    departureDate,
    propertyId: resolvedPropertyId,
    propertyTitle,
  };
};

export default fetchBookingDetailsAndAccommodation;
