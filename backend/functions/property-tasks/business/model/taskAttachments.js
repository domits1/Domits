import { BadRequestException } from "../../util/exception/badRequestException.js";
import { NotFoundException } from "../../util/exception/notFoundException.js";

const FILE_DIRECTLY_IN_FOLDER = /^[^/]+$/;

export const attachmentFolderOf = (hostId) => `tasks/${hostId}/`;

export const isAttachmentOfHost = (hostId, key) => {
    const isHostId = typeof hostId === "string" && hostId.length > 0;
    if (!isHostId || typeof key !== "string") return false;
    const folder = attachmentFolderOf(hostId);
    return key.startsWith(folder) && FILE_DIRECTLY_IN_FOLDER.test(key.slice(folder.length));
};

export const attachmentsOfHost = (hostId, keys) => keys.filter((key) => isAttachmentOfHost(hostId, key));

export const assertAttachmentsOfHost = (hostId, attachments, keysAlreadyOnTask = []) => {
    if (!Array.isArray(attachments)) {
        throw new BadRequestException("attachments must be a list of uploaded files");
    }
    const isAccepted = (key) => keysAlreadyOnTask.includes(key) || isAttachmentOfHost(hostId, key);
    if (!attachments.every(isAccepted)) {
        throw new BadRequestException("attachments can only hold files uploaded for this host");
    }
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
