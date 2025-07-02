import LambdaRepository from "../data/lambdaRepository.js";
import CalculateDifferenceInNights from "./calculateDifferenceInNights.js";

async function CalculateTotalRate (propertyId, dates) {
      const pricing = await new LambdaRepository().getPropertyPricingById(propertyId);
      const differenceInDays = CalculateDifferenceInNights(dates.arrivalDate, dates.departureDate);
      const total = (pricing.pricing.roomrate * 1.15 + pricing.pricing.cleaning) * differenceInDays; // workaround: encapsulate pricing
      return Math.round(total * 100); 
};
export default CalculateTotalRate;