import LambdaRepository from "../data/lambdaRepository.js"; 
// import CalculateDifferenceInNights from "./calculateDifferenceInNights.js";

async function CalculateTotalRate(propertyId, dates) {
  const pricing = await new LambdaRepository().getPropertyPricingById(propertyId);
  
  const oneDay = 24 * 60 * 60 * 1000;
  const start = new Date(dates.arrivalDate);
  const end = new Date(dates.departureDate);
  const diffTime = Math.abs(end - start);
  const differenceInDays = Math.round(diffTime / oneDay);

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