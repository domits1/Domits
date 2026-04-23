import { EntitySchema } from "typeorm";

const bigintTransformer = {
    from: (value) => value !== null && value !== undefined ? Number(value) : null,
    to: (value) => value,
};

export const PropertyTask = new EntitySchema({
    name: "PropertyTask",
    tableName: "property_task",
    columns: {
        id: { primary: true, type: "uuid", generated: "uuid" },
        host_id: { type: "varchar", nullable: false },
        property_id: { type: "varchar", nullable: false },
        property_snapshot_label: { type: "varchar", nullable: false },
        title: { type: "varchar", nullable: false },
        type: { type: "varchar", nullable: false },
        description: { type: "text", nullable: true },
status: { type: "varchar", default: "Pending" },
        priority: { type: "varchar", default: "Medium" },
        due_date: { type: "bigint", nullable: true, transformer: bigintTransformer },
        assignee_name: { type: "varchar", nullable: true },
        completed_date: { type: "bigint", nullable: true, transformer: bigintTransformer },
        attachments: { type: "text", nullable: true },
        is_legacy: { type: "boolean", default: false },
        created_at: { type: "bigint", nullable: false, transformer: bigintTransformer },
        updated_at: { type: "bigint", nullable: false, transformer: bigintTransformer }
    }
});
