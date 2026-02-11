import {EntitySchema} from "typeorm";

export const Faq = new EntitySchema({
    name: "Faq",
    tableName: "faq",
    columns: {
        faq_id: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        answer: {
            type: "text",
            nullable: false
        },
        question: {
            type: "text",
            nullable: false
        },
        user: {
            type: "varchar",
            nullable: false
        }
    }
})