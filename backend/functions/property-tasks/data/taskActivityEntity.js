export const TaskActivityEntity = {
    name: "PropertyTaskActivity",
    tableName: "property_task_activity",
    columns: {
        id: { primary: true, type: "uuid", generated: "uuid" },
        task_id: { type: "uuid", nullable: false },
        user_id: { type: "varchar", nullable: false },
        action_type: { type: "varchar" },
        description: { type: "text", nullable: true },
        old_value: { type: "text", nullable: true },
        new_value: { type: "text", nullable: true },
        created_at: { type: "bigint" }
    }
};