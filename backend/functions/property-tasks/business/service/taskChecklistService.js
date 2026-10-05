import * as taskRepository from "../../data/taskRepository.js";
import { validateChecklistItemPayload, isValidUuid } from "../model/checklistItemValidator.js";
import Database from "database";
import { BadRequestException } from "../../util/exception/badRequestException.js";

const getOwnedTaskOrThrow = async (dataSource, hostId, taskId) => {
    const task = await taskRepository.getTaskById(dataSource, taskId, hostId);
    if (!task) throw new Error("Task not found or access denied");
    return task;
};

const getOwnedChecklistItemOrThrow = async (dataSource, hostId, itemId) => {
    const item = await taskRepository.getChecklistItemById(dataSource, itemId);
    if (!item) throw new Error("Checklist item not found or access denied");
    await getOwnedTaskOrThrow(dataSource, hostId, item.task_id);
    return item;
};

export const getChecklistItems = async (hostId, taskId) => {
    const dataSource = await Database.getInstance();
    await getOwnedTaskOrThrow(dataSource, hostId, taskId);
    return await taskRepository.getChecklistItemsForTask(dataSource, taskId);
};

export const createChecklistItem = async (hostId, taskId, itemData) => {
    const dataSource = await Database.getInstance();
    await getOwnedTaskOrThrow(dataSource, hostId, taskId);

    validateChecklistItemPayload(itemData);

    const existingItems = await taskRepository.getChecklistItemsForTask(dataSource, taskId);

    const record = {
        task_id: taskId,
        title: itemData.title,
        position: existingItems.length,
        is_required: itemData.is_required ?? true,
        requires_evidence: itemData.requires_evidence ?? false,
        owner_team_member_id: itemData.owner_team_member_id || null,
        is_checked: false,
        evidence_key: null,
        checked_at: null,
        checked_by: null,
        created_at: Date.now(),
        updated_at: Date.now(),
    };

    return await taskRepository.saveChecklistItemToDb(dataSource, record);
};

export const updateChecklistItem = async (hostId, itemId, updateData) => {
    const dataSource = await Database.getInstance();
    const item = await getOwnedChecklistItemOrThrow(dataSource, hostId, itemId);

    const fieldsToUpdate = Object.fromEntries(
        Object.entries({ ...updateData }).filter(([, v]) => v !== undefined)
    );

    if (fieldsToUpdate.title !== undefined && fieldsToUpdate.title.trim().length === 0) {
        throw new BadRequestException("title cannot be empty");
    }

    if (fieldsToUpdate.owner_team_member_id && !isValidUuid(fieldsToUpdate.owner_team_member_id)) {
        throw new BadRequestException("owner_team_member_id must be a valid UUID");
    }

    if (fieldsToUpdate.is_checked !== undefined && fieldsToUpdate.is_checked !== item.is_checked) {
        fieldsToUpdate.checked_at = fieldsToUpdate.is_checked ? Date.now() : null;
        fieldsToUpdate.checked_by = fieldsToUpdate.is_checked ? hostId : null;
    }

    fieldsToUpdate.updated_at = Date.now();

    await taskRepository.updateChecklistItemInDb(dataSource, itemId, fieldsToUpdate);
    return { message: "Checklist item updated successfully" };
};

export const deleteChecklistItem = async (hostId, itemId) => {
    const dataSource = await Database.getInstance();
    await getOwnedChecklistItemOrThrow(dataSource, hostId, itemId);
    await taskRepository.deleteChecklistItemFromDb(dataSource, itemId);
    return { message: "Checklist item deleted successfully" };
};
