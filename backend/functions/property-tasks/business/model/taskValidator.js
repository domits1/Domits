export const validateTaskPayload = (data) => {
    const errors = [];

    if (!data.title || data.title.trim().length === 0) {
        errors.push("Title is required");
    }

    if (!data.property || !data.property.propertyId) {
        errors.push("Property selection must include a valid ID");
    }

    if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(", ")}`);
    }

    return true;
};