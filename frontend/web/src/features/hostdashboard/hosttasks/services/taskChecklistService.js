import { TASKS_API_URL, getHeaders } from '../../services/taskService';

const throwWithBackendMessage = async (response, fallback) => {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.message || fallback);
};

const normalizeChecklistItem = (item) => ({
    id: item.id,
    taskId: item.task_id,
    title: item.title,
    position: item.position,
    isRequired: item.is_required,
    isChecked: item.is_checked,
    requiresEvidence: item.requires_evidence,
    evidenceKey: item.evidence_key,
    ownerTeamMemberId: item.owner_team_member_id,
    checkedAt: item.checked_at,
    checkedBy: item.checked_by,
});

const toBackendPayload = (itemData) => {
    const payload = {};
    if (itemData.title !== undefined) payload.title = itemData.title;
    if (itemData.isRequired !== undefined) payload.is_required = itemData.isRequired;
    if (itemData.isChecked !== undefined) payload.is_checked = itemData.isChecked;
    if (itemData.requiresEvidence !== undefined) payload.requires_evidence = itemData.requiresEvidence;
    if (itemData.evidenceKey !== undefined) payload.evidence_key = itemData.evidenceKey;
    if (itemData.ownerTeamMemberId !== undefined) payload.owner_team_member_id = itemData.ownerTeamMemberId;
    return payload;
};

export const fetchChecklistItems = async (taskId) => {
    const params = new URLSearchParams({ action: 'checklist', taskId });
    const response = await fetch(`${TASKS_API_URL}?${params}`, { method: "GET", headers: getHeaders() });

    if (!response.ok) {
        await throwWithBackendMessage(response, `Failed to fetch checklist items: ${response.status}`);
    }

    const items = await response.json();
    return items.map(normalizeChecklistItem);
};

export const createChecklistItem = async (taskId, itemData) => {
    const params = new URLSearchParams({ action: 'checklist' });
    const response = await fetch(`${TASKS_API_URL}?${params}`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ taskId, ...toBackendPayload(itemData) }),
    });

    if (!response.ok) {
        await throwWithBackendMessage(response, `Failed to create checklist item: ${response.status}`);
    }

    const created = await response.json();
    return normalizeChecklistItem(created);
};

export const updateChecklistItem = async (itemId, updateData) => {
    const params = new URLSearchParams({ action: 'checklist', id: itemId });
    const response = await fetch(`${TASKS_API_URL}?${params}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(toBackendPayload(updateData)),
    });

    if (!response.ok) {
        await throwWithBackendMessage(response, `Failed to update checklist item: ${response.status}`);
    }

    return await response.json();
};

export const deleteChecklistItem = async (itemId) => {
    const params = new URLSearchParams({ action: 'checklist', id: itemId });
    const response = await fetch(`${TASKS_API_URL}?${params}`, {
        method: "DELETE",
        headers: getHeaders(),
    });

    if (!response.ok) {
        await throwWithBackendMessage(response, `Failed to delete checklist item: ${response.status}`);
    }

    return itemId;
};
