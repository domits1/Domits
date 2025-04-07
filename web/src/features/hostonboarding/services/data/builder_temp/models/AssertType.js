
export function assertType(value, type, fieldName) {
    if (typeof value !== type) {
        throw new Error(`propertyModel - ${fieldName} must be a ${type}.`);
    }
}