import { BadRequestException } from "../../util/exception/badRequestException.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isValidUuid = (value) => typeof value === 'string' && UUID_PATTERN.test(value);

export const validateChecklistItemPayload = (data) => {
    const errors = [];

    if (!data.title || data.title.trim().length === 0) {
        errors.push("title is required");
    }

    if (data.owner_team_member_id && !isValidUuid(data.owner_team_member_id)) {
        errors.push("owner_team_member_id must be a valid UUID");
    }

    if (errors.length > 0) {
        throw new BadRequestException(`Validation failed: ${errors.join(", ")}`);
    }

    return true;
};
