import { NotFoundException } from "../../util/exception/notFoundException.js";

const SERVER_MADE_FILE_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[^/]*$/;

export const attachmentFolderOf = (hostId) => `tasks/${hostId}/`;

export const isAttachmentOfHost = (hostId, key) => {
    const isHostId = typeof hostId === "string" && hostId.length > 0;
    if (!isHostId || typeof key !== "string") return false;
    const folder = attachmentFolderOf(hostId);
    return key.startsWith(folder) && SERVER_MADE_FILE_NAME.test(key.slice(folder.length));
};

export const parseStoredAttachments = (storedAttachments) => {
    if (!storedAttachments) return [];
    try {
        const parsed = JSON.parse(storedAttachments);
        return Array.isArray(parsed) ? parsed.filter((key) => typeof key === "string") : [];
    } catch {
        return [];
    }
};

export const findAttachmentOfTask = (hostId, task, key) => {
    const storedKey = parseStoredAttachments(task?.attachments).find((stored) => stored === key);
    if (!storedKey || !isAttachmentOfHost(hostId, storedKey)) {
        throw new NotFoundException("Attachment not found");
    }
    return storedKey;
};
