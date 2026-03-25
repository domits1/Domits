import { EntitySchema } from "typeorm";

const bigintTransformer = {
    from: (value) => value !== null && value !== undefined ? Number(value) : null,
    to: (value) => value,
};

export const Property_Task_Activity = new EntitySchema({
    name: "Property_Task_Activity",
    tableName: "property_task_activity",
    columns: {
        id: {
            primary: true,
            type: "uuid",
            generated: "uuid",
        },
        task_id: {
            type: "uuid",
            nullable: false,
        },
        user_id: {
            type: "varchar",
            nullable: false,
        },
        action_type: {
            type: "varchar",
            nullable: true,
        },
        description: {
            type: "text",
            nullable: true,
        },
        old_value: {
            type: "text",
            nullable: true,
        },
        new_value: {
            type: "text",
            nullable: true,
        },
        created_at: {
            type: "bigint",
            nullable: false,
            transformer: bigintTransformer,
        },
    },
});
