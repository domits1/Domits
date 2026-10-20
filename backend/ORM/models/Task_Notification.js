import { EntitySchema } from "typeorm";

const bigintTransformer = {
    from: (value) => value !== null && value !== undefined ? Number(value) : null,
    to: (value) => value,
};

// One row per notification per person. The id is built by the code that creates it from the
// event, the task, the person and the change, so the same event can only be stored once.
export const Task_Notification = new EntitySchema({
    name: "Task_Notification",
    tableName: "task_notification",
    columns: {
        id: { primary: true, type: "varchar", length: 255, nullable: false },
        user_id: { type: "varchar", length: 255, nullable: false },
        host_id: { type: "varchar", length: 255, nullable: false },
        task_id: { type: "varchar", length: 255, nullable: false },
        event_type: { type: "varchar", length: 50, nullable: false },
        title: { type: "varchar", length: 255, nullable: false },
        message: { type: "text", nullable: false },
        created_at: { type: "bigint", nullable: false, transformer: bigintTransformer },
        read_at: { type: "bigint", nullable: true, transformer: bigintTransformer },
    },
});
