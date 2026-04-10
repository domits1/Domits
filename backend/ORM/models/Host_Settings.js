import { EntitySchema } from "typeorm";

const bigintTransformer = {
    from: (value) => value !== null && value !== undefined ? Number(value) : null,
    to: (value) => value,
};

export const Host_Settings = new EntitySchema({
    name: "Host_Settings",
    tableName: "host_settings",
    columns: {
        host_id: { primary: true, type: "varchar", nullable: false },
        default_priority: { type: "varchar", default: "Medium" },
        default_assignee: { type: "varchar", nullable: true },
        auto_assign_cleaning: { type: "boolean", default: false },
        require_photo_proof: { type: "boolean", default: false },
        notif_email_assigned: { type: "boolean", default: true },
        notif_email_overdue: { type: "boolean", default: true },
        notif_email_completed: { type: "boolean", default: true },
        notif_sms_urgent: { type: "boolean", default: false },
        notif_inapp_enabled: { type: "boolean", default: true },
        updated_at: { type: "bigint", nullable: false, transformer: bigintTransformer }
    }
});
