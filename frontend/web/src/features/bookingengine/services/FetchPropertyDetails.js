import NotFoundException from "../../../utils/exception/NotFoundException";
import calculateDifferenceInNights from "../utils/CalculateDifferenceInNights";

const FetchPropertyDetails = async (propertyId, checkInDate, checkOutDate) => {
  try {
    const response = await fetch(
      `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/listingDetails?property=${propertyId}`
    );
    const accommodationData = await response.json();

    console.log("Accommodation Data:", accommodationData);
    const differenceInDays = calculateDifferenceInNights(checkInDate, checkOutDate);
    const totalRate = Math.round((accommodationData.pricing.roomRate * 1.15 + accommodationData.pricing.cleaning) * differenceInDays * 100) / 100;
    return { 
        roomRate: accommodationData.pricing.roomRate,
        cleaning: accommodationData.pricing.cleaning,
        images: accommodationData.images,
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
