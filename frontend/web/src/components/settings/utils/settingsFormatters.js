export const normalizePreferredMfa = (value) => {
    if (!value) return "NOMFA";
    if (value === "SOFTWARE_TOKEN_MFA") return "TOTP";
    if (value === "SMS_MFA") return "SMS";
    return value;
};

export const parseDateOfBirth = (value) => {
    const match = value?.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!match) return null;
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return null;
    }
    return date;
};

export const formatDateOfBirthValue = (date) => {
    if (!date) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}-${month}-${date.getFullYear()}`;
};

export const validateDateOfBirth = (value) => {
    if (!value) {
        return "Please enter a date of birth.";
    }
    const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!match) {
        return "Use format DD-MM-YYYY.";
    }
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    if (day < 1 || day > 31) {
        return "Day must be between 01 and 31.";
    }
    if (month < 1 || month > 12) {
        return "Month must be between 01 and 12.";
    }
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return "Please enter a valid calendar date.";
    }
    if (date > new Date()) {
        return "Date of birth cannot be in the future.";
    }
    return "";
};

export const formatBirthdateForStorage = (value) => {
    const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!match) return value;
    return `${match[3]}-${match[2]}-${match[1]}`;
};

export const formatBirthdateForDisplay = (value) => {
    if (!value) return value;
    if (/^\d{2}-\d{2}-\d{4}$/.test(value)) return value;
    const parts = value.split("-");
    if (parts.length !== 3 || parts[0].length !== 4) return value;
    const [year, month, day] = parts;
    const paddedMonth = month.padStart(2, "0");
    const paddedDay = day.padStart(2, "0");
    return `${paddedDay}-${paddedMonth}-${year}`;
};

export const validateNationality = (value) => {
    const trimmed = value.trim();
    if (!trimmed) {
        return "Please enter a nationality.";
    }
    if (value !== trimmed) {
        return "Use letters, spaces, hyphens, or apostrophes.";
    }
    if (trimmed.length < 2 || trimmed.length > 64) {
        return "Nationality must be 2 to 64 characters.";
    }
    if (!/^[A-Za-z][A-Za-z\s'-]*$/.test(trimmed)) {
        return "Use letters, spaces, hyphens, or apostrophes.";
    }
    return "";
};
