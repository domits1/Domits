export const MAX_REGISTRATION_NUMBER_LENGTH = 255;

// The backend generates "AUTO-<uuid>" when no number was given. Only that exact shape is a placeholder, so a real
// number such as "Auto-1234" is displayed and saved. Keep identical to the backend util/constant/registrationNumber.js.
const AUTO_REGISTRATION_NUMBER_PATTERN =
    /^AUTO-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A missing key or a non-string means the response is broken; "" and the placeholder mean "no number yet".
export const isRegistrationNumberMissing = (registrationNumber) => typeof registrationNumber !== "string";

export const toDisplayRegistrationNumber = (registrationNumber) => {
    if (isRegistrationNumberMissing(registrationNumber)) {
        return "";
    }
    const value = registrationNumber.trim();
    return AUTO_REGISTRATION_NUMBER_PATTERN.test(value) ? "" : value;
};

export const isRegistrationNumberValid = (registrationNumber) => {
    const value = String(registrationNumber ?? "").trim();
    return (
        value.length > 0 &&
        value.length <= MAX_REGISTRATION_NUMBER_LENGTH &&
        !AUTO_REGISTRATION_NUMBER_PATTERN.test(value)
    );
};

export const getSaveErrorKey = (error) => {
    switch (error?.status) {
        case 409:
            return "duplicate";
        case 403:
            return "noAccess";
        case 400:
            return "validation";
        default:
            return "generic";
    }
};
