import { BadRequestException } from "../../util/exception/badRequestException.js";

export const TASK_EDITOR_ROLES = Object.freeze({
    HOST: "host",
    TEAM_MEMBER: "team member",
});

const TASK_DETAIL_FIELDS = Object.freeze([
    "title",
    "description",
    "property_id",
    "property_snapshot_label",
    "type",
    "status",
    "priority",
    "due_date",
    "assignee_name",
    "assignee_team_member_id",
    "parent_task_id",
    "attachments",
]);

const EDITABLE_FIELDS_BY_ROLE = Object.freeze({
    [TASK_EDITOR_ROLES.HOST]: new Set(TASK_DETAIL_FIELDS),
    [TASK_EDITOR_ROLES.TEAM_MEMBER]: new Set(TASK_DETAIL_FIELDS),
});

export const assertOnlyEditableFields = (role, updateData) => {
    const editableFields = EDITABLE_FIELDS_BY_ROLE[role] ?? new Set();
    const lockedFields = Object.keys(updateData ?? {}).filter((field) => !editableFields.has(field));
    if (lockedFields.length > 0) {
        throw new BadRequestException(`These fields cannot be changed: ${lockedFields.join(", ")}`);
    }
};
