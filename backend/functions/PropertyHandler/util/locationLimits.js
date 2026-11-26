export const MAX_HOUSE_NUMBER = 2147483647;
export const MAX_HOUSE_NUMBER_EXTENSION_LENGTH = 45;

export const getLocationLimitError = ({ houseNumber, houseNumberExtension }) => {
  if (typeof houseNumber === "number") {
    if (!(houseNumber <= MAX_HOUSE_NUMBER)) {
      return `Location houseNumber must be ${MAX_HOUSE_NUMBER} or lower.`;
    }
    if (houseNumber < 1) {
      return "Location houseNumber must be at least 1.";
    }
    if (!Number.isInteger(houseNumber)) {
      return "Location houseNumber must be a whole number.";
    }
  }
  if (typeof houseNumberExtension === "string" && [...houseNumberExtension].length > MAX_HOUSE_NUMBER_EXTENSION_LENGTH) {
    return `Location houseNumberExtension must be ${MAX_HOUSE_NUMBER_EXTENSION_LENGTH} characters or fewer.`;
  }
  return "";
};
