export const MAX_REGISTRATION_NUMBER_LENGTH = 255;

const AUTO_REGISTRATION_NUMBER_PATTERN =
    /^AUTO-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
