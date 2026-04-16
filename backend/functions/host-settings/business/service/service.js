import { Repository } from "../../data/repository.js";
import Database from "database";

export class Service {
    constructor() {
        this.repository = new Repository();
    }

    async getSettings(hostId) {
        const dataSource = await Database.getInstance();
        const settings = await this.repository.getSettings(dataSource, hostId);
        if (settings) return settings;
        return this.getDefaults(hostId);
    }

    async updateSettings(hostId, data) {
        const dataSource = await Database.getInstance();
        const existing = await this.repository.getSettings(dataSource, hostId);
        const record = {
            host_id: hostId,
            default_priority: data.default_priority ?? (existing?.default_priority ?? 'Medium'),
            default_assignee: data.default_assignee ?? (existing?.default_assignee ?? null),
            auto_assign_cleaning: data.auto_assign_cleaning ?? (existing?.auto_assign_cleaning ?? false),
            require_photo_proof: data.require_photo_proof ?? (existing?.require_photo_proof ?? false),
            notif_email_assigned: data.notif_email_assigned ?? (existing?.notif_email_assigned ?? true),
            notif_email_overdue: data.notif_email_overdue ?? (existing?.notif_email_overdue ?? true),
            notif_email_completed: data.notif_email_completed ?? (existing?.notif_email_completed ?? true),
            notif_sms_urgent: data.notif_sms_urgent ?? (existing?.notif_sms_urgent ?? false),
            notif_inapp_enabled: data.notif_inapp_enabled ?? (existing?.notif_inapp_enabled ?? true),
            updated_at: Date.now()
        };
        await this.repository.upsertSettings(dataSource, record);
        return record;
    }

    getDefaults(hostId) {
        return {
            host_id: hostId,
            default_priority: 'Medium',
            default_assignee: null,
            auto_assign_cleaning: false,
            require_photo_proof: false,
            notif_email_assigned: true,
            notif_email_overdue: true,
            notif_email_completed: true,
            notif_sms_urgent: false,
            notif_inapp_enabled: true
        };
    }
}