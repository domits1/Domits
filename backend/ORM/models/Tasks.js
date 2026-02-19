import {EntitySchema} from "typeorm";

export const Task = new EntitySchema({
    name: "Task",
    tableName: "task",
    columns: {
        task_id: {
            primary: true,
            type: "uuid",
            generated: "uuid",
            nullable: false
        },
        title: {
            type: "varchar",
            nullable: false
        },
        description: {
            type: "varchar",
            nullable: false
        },
        property: {
            type: "varchar",
            nullable: false
        },
        booking_reference: {
            type: "varchar",
            nullable: true
        },
        type: {
            type: "varchar",
            nullable: false
        },
        assignee: {
            type: "varchar",
            nullable: false
        },
        attachments: {
            type: "varchar",
            nullable: true
        },
        status: {
            type: "varchar",
            nullable: false
        }
    }
})