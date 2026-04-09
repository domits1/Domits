import { getAccessToken } from "../../../services/getAccessToken";

const SETTINGS_API_URL = "PASTE_YOUR_HOST_SETTINGS_URL_HERE";

const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: getAccessToken(),
});

const toFrontend = (data) => ({
    notifEmailAssigned: data.notif_email_assigned ?? true,
    notifEmailOverdue: data.notif_email_overdue ?? true,
    notifEmailCompleted: data.notif_email_completed ?? true,
    notifSmsUrgent: data.notif_sms_urgent ?? false,
    notifInappEnabled: data.notif_inapp_enabled ?? true,
    defaultPriority: data.default_priority ?? 'Medium',
    defaultAssignee: data.default_assignee ?? 'Anyone',
    autoAssignCleaning: data.auto_assign_cleaning ?? false,
    requirePhotoProof: data.require_photo_proof ?? false,
});

const toBackend = (data) => ({
    notif_email_assigned: data.notifEmailAssigned,
    notif_email_overdue: data.notifEmailOverdue,
    notif_email_completed: data.notifEmailCompleted,
    notif_sms_urgent: data.notifSmsUrgent,
    notif_inapp_enabled: data.notifInappEnabled,
    default_priority: data.defaultPriority,
    default_assignee: data.defaultAssignee === 'Anyone' ? null : data.defaultAssignee,
    auto_assign_cleaning: data.autoAssignCleaning,
    require_photo_proof: data.requirePhotoProof,
});

export const fetchSettings = async () => {
    const response = await fetch(SETTINGS_API_URL, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!response.ok) throw new Error(`Failed to fetch settings: ${response.status}`);
    const data = await response.json();
    return toFrontend(data);
};

export const saveSettings = async (settings) => {
    const response = await fetch(SETTINGS_API_URL, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(toBackend(settings)),
    });
    if (!response.ok) throw new Error(`Failed to save settings: ${response.status}`);
    return await response.json();
};
