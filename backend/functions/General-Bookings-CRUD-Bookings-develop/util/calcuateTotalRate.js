import LambdaRepository from "../data/lambdaRepository.js";
import CalculateDifferenceInNights from "./calculateDifferenceInNights.js";

async function CalculateTotalRate (propertyId, dates) {
      const pricing = await new LambdaRepository().getPropertyPricingById(propertyId);
      const differenceInDays = CalculateDifferenceInNights(dates.arrivalDate, dates.departureDate);
      const basepricing = pricing.pricing[0];
      const total = (basepricing.roomrate * 1.10 + basepricing.cleaning) * differenceInDays; // workaround: encapsulate pricing
      return Math.round(total * 100); 
};
export default CalculateTotalRate;