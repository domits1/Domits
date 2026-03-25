export const validateTaskPayload = (data) => {
    const errors = [];

    if (!data.title || data.title.trim().length === 0) {
        errors.push("Title is required");
    }

    if (!data.property_id) {
        errors.push("property_id is required");
    }

    if (!data.property_snapshot_label) {
        errors.push("property_snapshot_label is required");
    }

    if (!data.type) {
        errors.push("type is required");
    }

    if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(", ")}`);
    }

    return true;
};
