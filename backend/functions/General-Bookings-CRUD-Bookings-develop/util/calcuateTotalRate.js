import LambdaRepository from "../data/lambdaRepository.js";
import CalculateDifferenceInNights from "./calculateDifferenceInNights.js";

async function CalculateTotalRate(propertyId, dates) {
  const pricing = await new LambdaRepository().getPropertyPricingById(propertyId);
  const differenceInDays = CalculateDifferenceInNights(dates.arrivalDate, dates.departureDate);
  const basepricing = pricing.pricing[0];
  const hostCents = (basepricing.roomrate + basepricing.cleaning) * differenceInDays;
  const platformCents = hostCents * 0.1;
  const totalCents = hostCents + platformCents;
  return {
    hostCents: Math.round(hostCents * 100),
    platformCents: Math.round(platformCents * 100),
    totalCents: Math.round(totalCents * 100),
  };
}
export default CalculateTotalRate;