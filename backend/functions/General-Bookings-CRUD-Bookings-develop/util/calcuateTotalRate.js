import LambdaRepository from "../data/lambdaRepository.js"; 
// import CalculateDifferenceInNights from "./calculateDifferenceInNights.js";

async function CalculateTotalRate (propertyId, dates) {

  const pricing = await new LambdaRepository().getPropertyPricingById(propertyId);
  
  const oneDay = 24 * 60 * 60 * 1000;
  const start = new Date(dates.arrivalDate);
  const end = new Date(dates.departureDate);
  const diffTime = Math.abs(end - start);
  const differenceInDays = Math.round(diffTime / oneDay);

  const basepricing = pricing.pricing[0];

  const totalWithoutCleaningfee = (basepricing.roomrate * 1.1) * differenceInDays; 
  const totalWithCleaningfee = (basepricing.roomrate * 1.1 + basepricing.cleaning) * differenceInDays; 

  return {
    totalWithoutCleaningfee: Math.round(totalWithoutCleaningfee * 100),
    totalWithCleaningfee: Math.round(totalWithCleaningfee * 100),
  };
};
export default CalculateTotalRate;