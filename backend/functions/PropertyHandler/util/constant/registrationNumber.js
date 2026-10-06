export const MAX_REGISTRATION_NUMBER_LENGTH = 255;

// propertyBuilder.js generates "AUTO-<uuid>" placeholders. Only that exact shape is reserved, so a real number such as
// "Auto-1234" stays valid. Keep identical to hostsettings/utils/registrationNumber.js in the web app.
export const AUTO_REGISTRATION_NUMBER_PATTERN =
    /^AUTO-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const REGISTRATION_NUMBER_TAKEN_MESSAGE = "This registration number is already used by another listing.";
