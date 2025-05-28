export const validatePhoneNumber = (number) => {
    const phoneRegex = /^\d{7,15}$/; // Adjust regex as needed
    return phoneRegex.test(number);
};
