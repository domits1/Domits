// House number rules shared by the host property editor and the onboarding address step. A location
// stores the number in an INTEGER column and the rest in a text extension, so what the host types has
// to start with digits: "12", "12A", "12 A" and "12-14" fit, "A12" does not.

export const MAX_HOUSE_NUMBER = 2147483647;

export const HOUSE_NUMBER_FORMAT_MESSAGE = "House number must start with a number, for example 12 or 12A.";
export const HOUSE_NUMBER_TOO_SMALL_MESSAGE = "House number must be at least 1.";
export const HOUSE_NUMBER_TOO_LARGE_MESSAGE = `House number must be ${MAX_HOUSE_NUMBER} or lower.`;

const LEADING_DIGITS = /^(\d+)([\s\S]*)$/;

// Splits the input at the end of its leading digits. Null when it does not start with a digit.
// The number is not range checked here; getHouseNumberError decides whether it can be stored.
export const parseHouseNumber = (houseNumberInput) => {
  const match = LEADING_DIGITS.exec(String(houseNumberInput ?? "").trim());
  if (!match) {
    return null;
  }

  return {
    houseNumber: Number(match[1]),
    houseNumberExtension: match[2].trim(),
  };
};

// The message to show the host, or "" when the value can be saved. An empty value has no error: the
// callers decide separately whether a missing house number matters.
export const getHouseNumberError = (houseNumberInput) => {
  if (!String(houseNumberInput ?? "").trim()) {
    return "";
  }

  const parsed = parseHouseNumber(houseNumberInput);
  if (!parsed) {
    return HOUSE_NUMBER_FORMAT_MESSAGE;
  }
  if (!Number.isFinite(parsed.houseNumber) || parsed.houseNumber > MAX_HOUSE_NUMBER) {
    return HOUSE_NUMBER_TOO_LARGE_MESSAGE;
  }
  if (parsed.houseNumber < 1) {
    return HOUSE_NUMBER_TOO_SMALL_MESSAGE;
  }
  return "";
};
