import LambdaRepository from "../data/lambdaRepository.js";
import CalculateDifferenceInNights from "./calculateDifferenceInNights.js";

async function CalculateTotalRate (propertyId, dates) {
  const pricing = await new LambdaRepository().getPropertyPricingById(propertyId);
  const differenceInDays = CalculateDifferenceInNights(dates.arrivalDate, dates.departureDate);
  const basepricing = pricing.pricing[0];
  const totalWithoutCleaningfee = (basepricing.roomrate * 1.1) * differenceInDays;
  const totalWithCleaningfee = (basepricing.roomrate + basepricing.cleaning) * differenceInDays;
  return {
    totalWithoutCleaningfee: Math.round(totalWithoutCleaningfee * 100),
    totalWithCleaningfee: Math.round(totalWithCleaningfee * 100),
  };
};
export default CalculateTotalRate;