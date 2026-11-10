import { EntitySchema } from "typeorm";

const bigintTransformer = {
    from: (value) => value !== null && value !== undefined ? Number(value) : null,
    to: (value) => value,
};

export const Property_Task_Checklist_Item = new EntitySchema({
    name: "Property_Task_Checklist_Item",
    tableName: "property_task_checklist_item",
    columns: {
        id: { primary: true, type: "uuid", generated: "uuid" },
        task_id: { type: "uuid", nullable: false },
        title: { type: "varchar", nullable: false },
        position: { type: "int", nullable: false, default: 0 },
        is_required: { type: "boolean", nullable: false, default: true },
        is_checked: { type: "boolean", nullable: false, default: false },
        requires_evidence: { type: "boolean", nullable: false, default: false },
        evidence_key: { type: "varchar", nullable: true },
        owner_team_member_id: { type: "uuid", nullable: true },
        checked_at: { type: "bigint", nullable: true, transformer: bigintTransformer },
        checked_by: { type: "varchar", nullable: true },
        created_at: { type: "bigint", nullable: false, transformer: bigintTransformer },
        updated_at: { type: "bigint", nullable: false, transformer: bigintTransformer },
    },
});
