import { EntitySchema } from "typeorm";

export const UnifiedMessage = new EntitySchema({
    name: "UnifiedMessage",
    tableName: "unified_message",
    columns: {
        id: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        threadId: {
            type: "varchar",
            nullable: false
        },
        senderId: {
            type: "varchar",
            nullable: false
        },
        recipientId: {
            type: "varchar",
            nullable: false
        },
        content: {
            type: "text",
            nullable: false
        },
        platformMessageId: {
            type: "varchar",
            nullable: true
        },
        createdAt: {
            type: "bigint",
            transformer: {
                from: (value) => Number(value),
                to: (value) => value,
            },
            nullable: false
        },
        isRead: {
            type: "boolean",
            default: false,
            nullable: true
        },
        metadata: {
            type: "text",
            nullable: true
        },
        attachments: {
            type: "text", // JSON string to store array of { url: string, type: string, name: string }
            nullable: true
        },
        deliveryStatus: {
            type: "varchar", // 'pending', 'sent', 'delivered', 'failed'
            default: "pending",
            nullable: true
        }
    }
});
