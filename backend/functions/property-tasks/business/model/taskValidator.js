import { BadRequestException } from "../../util/exception/badRequestException.js";

export const VALID_TASK_TYPES = [
    'Cleaning', 'Maintenance', 'Inspection', 'Mid-stay',
    'Sanitation', 'Check-in', 'Inventory', 'Administration', 'Issue'
];

export const isPastDueDate = (dueDate) => {
    if (!dueDate) return false;
    const startOfTodayUtc = new Date(new Date().toISOString().split('T')[0]).getTime();
    return new Date(dueDate).getTime() < startOfTodayUtc;
};

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

    if (!data.type || !VALID_TASK_TYPES.includes(data.type)) {
        errors.push(`type must be one of: ${VALID_TASK_TYPES.join(", ")}`);
    }

    if (data.due_date && isPastDueDate(data.due_date)) {
        errors.push("due_date cannot be in the past");
    }

    if (errors.length > 0) {
        throw new BadRequestException(`Validation failed: ${errors.join(", ")}`);
    }

    return true;
};
