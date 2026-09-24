// Mirrors the accommodation type options offered in the host onboarding wizard
// (frontend/web/src/features/hostonboarding/constants/propertyTypeData.js), so a
// draft can never be saved with a type the UI doesn't actually offer.
export const ALLOWED_PROPERTY_TYPES = Object.freeze(["Villa", "House", "Apartment", "Boat", "Camper", "Cottage"]);
