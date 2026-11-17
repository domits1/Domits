// Limits of the property_location columns: housenumber is an INTEGER and housenumberextension a
// VARCHAR(45). Checked on write only (overview update and create). Rows are read back through
// PropertyLocation without these checks, so a row stored before they existed still loads.
export const MAX_HOUSE_NUMBER = 2147483647;
export const MAX_HOUSE_NUMBER_EXTENSION_LENGTH = 45;

// The message for a value the columns cannot store, or "" when it fits. A missing house number is
// not handled here: the callers have their own message for that.
export const getLocationLimitError = ({ houseNumber, houseNumberExtension }) => {
  if (typeof houseNumber === "number") {
    if (!(houseNumber <= MAX_HOUSE_NUMBER)) {
      return `Location houseNumber must be ${MAX_HOUSE_NUMBER} or lower.`;
    }
    if (houseNumber < 1) {
      return "Location houseNumber must be at least 1.";
    }
  }
  // VARCHAR counts characters, not UTF-16 units, so an emoji is one.
  if (typeof houseNumberExtension === "string" && [...houseNumberExtension].length > MAX_HOUSE_NUMBER_EXTENSION_LENGTH) {
    return `Location houseNumberExtension must be ${MAX_HOUSE_NUMBER_EXTENSION_LENGTH} characters or fewer.`;
  }
  return "";
};
