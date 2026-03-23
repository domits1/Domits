export const TaskEntity = {
    name: "PropertyTask",
    tableName: "property_task",
    columns: {
        id: { primary: true, type: "uuid", generated: "uuid" },
        host_id: { type: "varchar" },
        property_id: { type: "varchar" },
        property_snapshot_label: { type: "varchar" },
        title: { type: "varchar" },
        description: { type: "text", nullable: true },
        status: { type: "varchar", default: "Pending" },
        priority: { type: "varchar", default: "Medium" },
        due_date: { type: "bigint", nullable: true },
        assignee_name: { type: "varchar", nullable: true },
        is_legacy: { type: "boolean", default: false },
        created_at: { type: "bigint" },
        updated_at: { type: "bigint" }
    }
};