import { getAccessToken } from "../../../services/getAccessToken";

const TASKS_API_URL = "https://mzubqhvg7j.execute-api.eu-north-1.amazonaws.com/default";

const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: getAccessToken(),
});

const toUnixTimestamp = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).getTime();
};

const toDateString = (timestamp) => {
    if (!timestamp) return null;
    return new Date(Number(timestamp)).toISOString().split("T")[0];
};

const normalizeTask = (task) => ({
    ...task,
    property: task.property_snapshot_label || "",
    assignee: task.assignee_name || "",
    dueDate: toDateString(task.due_date),
    completedAt: toDateString(task.completed_date),
    isLegacy: task.is_legacy,
});

const toBackendPayload = (taskData) => {
    const payload = {};
    if (taskData.title !== undefined) payload.title = taskData.title;
    if (taskData.description !== undefined) payload.description = taskData.description || null;
    if (taskData.property_id !== undefined) payload.property_id = taskData.property_id;
    if (taskData.property_snapshot_label !== undefined || taskData.property !== undefined) {
        payload.property_snapshot_label = taskData.property_snapshot_label || taskData.property;
    }
    if (taskData.type !== undefined) payload.type = taskData.type;
    if (taskData.status !== undefined) payload.status = taskData.status;
    if (taskData.priority !== undefined) payload.priority = taskData.priority;
    if (taskData.dueDate !== undefined) payload.due_date = toUnixTimestamp(taskData.dueDate);
    if (taskData.assignee !== undefined || taskData.assignee_name !== undefined) {
        payload.assignee_name = taskData.assignee || taskData.assignee_name || null;
    }
    return payload;
};

export const fetchTasks = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.propertyId) params.set("propertyId", filters.propertyId);
    if (filters.status && filters.status !== "All statuses") params.set("status", filters.status);
    if (filters.priority && filters.priority !== "Any priority") params.set("priority", filters.priority);
    if (filters.assignee && filters.assignee !== "Anyone") params.set("assignee", filters.assignee);
    if (filters.search) params.set("search", filters.search);
    if (filters.sortBy) params.set("sortBy", filters.sortBy);
    if (filters.sortDir) params.set("sortDir", filters.sortDir);

    const url = params.toString() ? `${TASKS_API_URL}?${params}` : TASKS_API_URL;
    const response = await fetch(url, { method: "GET", headers: getHeaders() });

    if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status}`);
    }

    const tasks = await response.json();
    return tasks.map(normalizeTask);
};

export const createTask = async (taskData) => {
    const response = await fetch(TASKS_API_URL, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(toBackendPayload(taskData)),
    });

    if (!response.ok) {
        throw new Error(`Failed to create task: ${response.status}`);
    }

    const created = await response.json();
    return normalizeTask(created);
};

export const updateTask = async (taskId, updateData) => {
    const response = await fetch(`${TASKS_API_URL}?id=${taskId}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(toBackendPayload(updateData)),
    });

    if (!response.ok) {
        throw new Error(`Failed to update task: ${response.status}`);
    }

    return await response.json();
};

export const uploadTaskAttachment = async (file) => {
    const params = new URLSearchParams({
        action: 'upload-url',
        fileName: file.name,
        fileType: file.type,
    });

    const response = await fetch(`${TASKS_API_URL}?${params}`, {
        method: "GET",
        headers: getHeaders(),
    });

    if (!response.ok) {
        throw new Error(`Failed to get upload URL: ${response.status}`);
    }

    const { uploadUrl, key } = await response.json();

    await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
    });

    return key;
};

export const getAttachmentViewUrl = async (key) => {
    const params = new URLSearchParams({ action: 'view-url', key });
    const response = await fetch(`${TASKS_API_URL}?${params}`, {
        method: "GET",
        headers: getHeaders(),
    });

    if (!response.ok) throw new Error(`Failed to get view URL: ${response.status}`);
    const { viewUrl } = await response.json();
    return viewUrl;
};

export const deleteTask = async (taskId) => {
    const response = await fetch(`${TASKS_API_URL}?id=${taskId}`, {
        method: "DELETE",
        headers: getHeaders(),
    });

    if (!response.ok) {
        throw new Error(`Failed to delete task: ${response.status}`);
    }

    return taskId;
};
