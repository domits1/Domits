import { EntitySchema } from "typeorm";

const bigintTransformer = {
    from: (value) => value !== null && value !== undefined ? Number(value) : null,
    to: (value) => value,
};

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
