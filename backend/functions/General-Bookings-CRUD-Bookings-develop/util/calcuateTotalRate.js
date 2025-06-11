import LambdaRepository from "../data/lambdaRepository.js";
import CalculateDifferenceInNights from "./calculateDifferenceInNights.js";

async function CalculateTotalRate (propertyId, dates) {
      const pricing = await new LambdaRepository().getPropertyPricingById(propertyId);
      const differenceInDays = CalculateDifferenceInNights(dates.arrivalDate, dates.departureDate);
      const total = (pricing.roomRate * 1.15 + pricing.cleaning) * differenceInDays;
      return Math.round(total * 100); 
};
export default CalculateTotalRate;