const DEFAULT_MIN_ACTIVE_LISTINGS = 1;
const DEFAULT_PARENT_FROM_ANY_CHILD = true;

const readPositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : fallback;
};

const readBoolean = (value, fallback) => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "true" || normalized === "yes" || normalized === "1") {
    return true;
  }
  if (normalized === "false" || normalized === "no" || normalized === "0") {
    return false;
  }
  return fallback;
};

export const readDestinationSettings = (env = process.env) => ({
  minActiveListings: readPositiveInteger(env.DESTINATION_MIN_ACTIVE_LISTINGS, DEFAULT_MIN_ACTIVE_LISTINGS),
  parentFromAnyChild: readBoolean(env.DESTINATION_PARENT_FROM_ANY_CHILD, DEFAULT_PARENT_FROM_ANY_CHILD),
});

export const isDestinationEligible = (
  { activeListings = 0, eligibleChildren = 0 } = {},
  settings = readDestinationSettings()
) => {
  if (Number(activeListings) >= settings.minActiveListings) {
    return true;
  }
  return settings.parentFromAnyChild && Number(eligibleChildren) > 0;
};
