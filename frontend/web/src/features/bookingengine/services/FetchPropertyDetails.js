import NotFoundException from "../../../utils/exception/NotFoundException";
import calculateDifferenceInNights from "../utils/CalculateDifferenceInNights";

const FetchPropertyDetails = async (propertyId, checkInDate, checkOutDate) => {
  try {
    const response = await fetch(
      `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/listingDetails?property=${propertyId}`
    );
    const accommodationData = await response.json();

    const differenceInDays = calculateDifferenceInNights(checkInDate, checkOutDate);
    const hostTotal =
      Math.round(
        (accommodationData.pricing.roomRate + accommodationData.pricing.cleaning) * differenceInDays
      );
    const platformFee = Math.round(hostTotal * 0.1);
    const totalRate = Math.round(hostTotal + platformFee);
    return { 
        roomRate: accommodationData.pricing.roomRate,
        cleaning: accommodationData.pricing.cleaning,
        images: accommodationData.images,
        hostTotal: hostTotal,
        platformFee: platformFee,
        total: totalRate,
        title: accommodationData.property.title,
        city: accommodationData.location.city,
        country: accommodationData.location.country,
        differenceInDays: differenceInDays,
        hostId: accommodationData.property.hostId,
    }
  } catch (error) {
    console.error("Unable to fetch property data.", error);
    throw new NotFoundException("Tried to request property data, but failed. Please contact the devs.")
  }
};

export default FetchPropertyDetails;
