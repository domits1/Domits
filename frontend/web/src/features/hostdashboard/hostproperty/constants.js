export const PROPERTY_API_BASE = "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property";
export const TABS = ["Overview", "Photos", "Amenities", "Pricing", "Availability", "Policies"];
export const SPACE_TYPE_OPTIONS = ["Entire house", "Private room", "Shared room"];
export const MAX_CAPACITY_VALUE = 99;
export const AMENITY_CATEGORY_ORDER = [
  "Essentials",
  "Kitchen",
  "Bathroom",
  "Safety",
  "Outdoor",
  "Technology",
  "Bedroom",
  "LivingArea",
  "Laundry",
  "FamilyFriendly",
  "Convenience",
  "Accessibility",
  "ExtraServices",
  "EcoFriendly",
];
export const POLICY_RULE_CONFIG = [
  { rule: "SmokingAllowed", label: "No smoking", invert: true },
  { rule: "PetsAllowed", label: "No pets", invert: true },
  { rule: "Parties/EventsAllowed", label: "No parties or events", invert: true },
  { rule: "SuitableForChildren", label: "Suitable for children", invert: false },
  { rule: "SuitableForInfants", label: "Suitable for infants", invert: false },
];
export const PRICING_RESTRICTION_KEYS = {
  minimumStay: "MinimumStay",
  maximumStay: "MaximumStay",
  weeklyDiscountPercent: "WeeklyDiscountPercent",
  monthlyDiscountPercent: "MonthlyDiscountPercent",
  lastMinuteDiscountDays: "LastMinuteDiscountDaysBeforeCheckIn",
  lastMinuteDiscountPercent: "LastMinuteDiscountPercent",
  earlyBirdDiscountDays: "EarlyBirdDiscountDaysBeforeCheckIn",
  earlyBirdDiscountPercent: "EarlyBirdDiscountPercent",
};
export const PRICING_MIN_NIGHTLY_RATE_FOR_SAVE = 2;
export const PRICING_MIN_NIGHTLY_RATE_FOR_INPUT = 0;
export const PRICING_MAX_NIGHTLY_RATE = 100000;
export const PRICING_STAY_OPTIONS = Array.from({ length: 60 }, (_, index) => index + 1);
export const PRICING_MAX_STAY_OPTIONS = [0, ...PRICING_STAY_OPTIONS];
export const PRICING_DISCOUNT_PERCENT_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
export const PRICING_LAST_MINUTE_DAY_OPTIONS = [1, 2, 3, 5, 7, 10, 14];
export const PRICING_EARLY_BIRD_DAY_OPTIONS = [7, 14, 21, 30, 45, 60, 90];
export const PHOTO_CATEGORY_PLACEHOLDERS = ["Master Bedroom", "Living room", "Bedroom 2", "Bathroom"];
export const MAX_PROPERTY_IMAGES = 60;
export const MIN_PHOTO_WIDTH = 1024;
export const MIN_PHOTO_HEIGHT = 683;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_TOTAL_PENDING_PHOTO_BYTES = 5 * 1024 * 1024 * 60;
export const PHOTO_REORDER_LONG_PRESS_MS = 50;
export const PHOTO_REORDER_MOVE_CANCEL_PX = 12;
export const PHOTO_ACCEPT = ".jpg,.jpeg,.png,.webp";
export const PHOTO_ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const PHOTO_REORDER_KEY_DELTAS = {
  ArrowLeft: -1,
  ArrowUp: -1,
  ArrowRight: 1,
  ArrowDown: 1,
};

export const SAVE_ENABLED_TABS = new Set(["Overview", "Photos", "Amenities", "Pricing", "Policies"]);
export const SAVING_MESSAGE_BY_TAB = {
  Photos: "Uploading photos...",
  Amenities: "Saving amenities...",
  Pricing: "Saving pricing...",
  Policies: "Saving policies...",
};
export const SAVE_SUCCESS_MESSAGE_BY_TAB = {
  Amenities: "Amenities updated successfully.",
  Pricing: "Pricing updated successfully.",
  Policies: "Policies updated successfully.",
};

export const createInitialPolicyRules = () =>
  POLICY_RULE_CONFIG.reduce((accumulator, ruleConfig) => {
    accumulator[ruleConfig.rule] = false;
    return accumulator;
  }, {});

export const createInitialPricingForm = () => ({
  nightlyRate: 120,
  weekendRate: 120,
  minimumStay: 1,
  maximumStay: 0,
  weeklyDiscountEnabled: false,
  weeklyDiscountPercent: 10,
  monthlyDiscountEnabled: false,
  monthlyDiscountPercent: 10,
  lastMinuteDiscountEnabled: false,
  lastMinuteDiscountDays: 5,
  lastMinuteDiscountPercent: 10,
  earlyBirdDiscountEnabled: false,
  earlyBirdDiscountDays: 30,
  earlyBirdDiscountPercent: 10,
});
