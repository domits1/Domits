import * as taskRepository from "../../data/taskRepository.js";
import { validateTaskPayload, VALID_TASK_TYPES, VALID_TASK_STATUSES, isPastDueDate, isValidUuid } from "../model/taskValidator.js";
import { computeSlaStatus, SLA_STATUS } from "../model/slaStatus.js";
import { getHostEmailById, sendTaskEscalationEmail } from "./taskEscalationService.js";
import Database from "database";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { BadRequestException } from "../../util/exception/badRequestException.js";
const s3 = new S3Client({ region: "eu-north-1" });
const BUCKET_NAME = "domits-task-attachments";

export const getTasks = async (hostId, filters) => {
    const dataSource = await Database.getInstance();
    const tasks = await taskRepository.getTasksFromDb(dataSource, hostId, filters);
    const now = Date.now();
    return tasks.map(task => ({ ...task, sla_status: computeSlaStatus(task, now) }));
};

export const createTask = async (hostId, taskData) => {
    const dataSource = await Database.getInstance();

    validateTaskPayload(taskData);

    const assigneeName = taskData.assignee_team_member_id
        ? await resolveAssigneeName(dataSource, hostId, taskData.assignee_team_member_id)
        : taskData.assignee_name || null;

    const parentTaskId = taskData.parent_task_id
        ? await resolveParentTaskId(dataSource, hostId, taskData.parent_task_id)
        : null;

    const taskRecord = {
        host_id: hostId,
        property_id: taskData.property_id,
        property_snapshot_label: taskData.property_snapshot_label,
        title: taskData.title,
        type: taskData.type,
        description: taskData.description || null,
        status: 'Pending',
        priority: taskData.priority || 'Medium',
        due_date: taskData.due_date ? new Date(taskData.due_date).getTime() : null,
        assignee_name: assigneeName,
        assignee_team_member_id: taskData.assignee_team_member_id || null,
        parent_task_id: parentTaskId,
        attachments: taskData.attachments?.length > 0 ? JSON.stringify(taskData.attachments) : null,
        created_at: Date.now(),
        updated_at: Date.now()
    };

    const newTask = await taskRepository.saveTaskToDb(dataSource, taskRecord);

    await logActivity(dataSource, {
        taskId: newTask.id,
        userId: hostId,
        actionType: 'TASK_CREATED',
        newValue: 'Task created'
    });

    return newTask;
};

export const updateTask = async (hostId, taskId, updateData) => {
    const dataSource = await Database.getInstance();

    const oldTask = await taskRepository.getTaskById(dataSource, taskId, hostId);
    if (!oldTask) throw new Error("Task not found or access denied");

    const fieldsToUpdate = Object.fromEntries(
        Object.entries({ ...updateData }).filter(([, v]) => v !== undefined)
    );

    if (fieldsToUpdate.status !== undefined && !VALID_TASK_STATUSES.includes(fieldsToUpdate.status)) {
        throw new BadRequestException(`Invalid status: ${fieldsToUpdate.status}. Must be one of: ${VALID_TASK_STATUSES.join(", ")}`);
    }

    if (oldTask.status === 'Cancelled' && fieldsToUpdate.status !== undefined && fieldsToUpdate.status !== 'Cancelled') {
        throw new BadRequestException("Cancelled tasks cannot change status");
    }

    if (fieldsToUpdate.due_date !== undefined) {
    const nextDueDate = fieldsToUpdate.due_date === null ? null : new Date(fieldsToUpdate.due_date).getTime();
    if (nextDueDate !== oldTask.due_date && isPastDueDate(nextDueDate)) {
            throw new BadRequestException("due_date cannot be in the past");
    }
    fieldsToUpdate.due_date = nextDueDate;
    }

    if (fieldsToUpdate.type && !VALID_TASK_TYPES.includes(fieldsToUpdate.type)) {
        throw new BadRequestException(`Invalid type: ${fieldsToUpdate.type}. Must be one of: ${VALID_TASK_TYPES.join(", ")}`);
    }

    if (fieldsToUpdate.assignee_team_member_id !== undefined) {
        if (fieldsToUpdate.assignee_team_member_id && !isValidUuid(fieldsToUpdate.assignee_team_member_id)) {
            throw new BadRequestException("assignee_team_member_id must be a valid UUID");
        }
        fieldsToUpdate.assignee_name = fieldsToUpdate.assignee_team_member_id
            ? await resolveAssigneeName(dataSource, hostId, fieldsToUpdate.assignee_team_member_id)
            : null;
    }

    if (fieldsToUpdate.parent_task_id !== undefined) {
        if (fieldsToUpdate.parent_task_id) {
            if (!isValidUuid(fieldsToUpdate.parent_task_id)) {
                throw new BadRequestException("parent_task_id must be a valid UUID");
            }
            if (fieldsToUpdate.parent_task_id === taskId) {
                throw new BadRequestException("parent_task_id cannot reference itself");
            }
            fieldsToUpdate.parent_task_id = await resolveParentTaskId(dataSource, hostId, fieldsToUpdate.parent_task_id);
        }
    }

    if (fieldsToUpdate.attachments !== undefined) {
        const oldKeys = oldTask.attachments ? JSON.parse(oldTask.attachments) : [];
        const newKeys = Array.isArray(fieldsToUpdate.attachments) ? fieldsToUpdate.attachments : [];
        const removedKeys = oldKeys.filter(key => !newKeys.includes(key));
        if (removedKeys.length > 0) {
            await s3.send(new DeleteObjectsCommand({
                Bucket: BUCKET_NAME,
                Delete: { Objects: removedKeys.map(key => ({ Key: key })) },
            }));
        }
        fieldsToUpdate.attachments = newKeys.length > 0 ? JSON.stringify(newKeys) : null;
    }

    if (fieldsToUpdate.status === 'Completed' && oldTask.status !== 'Completed') {
        const checklistItems = await taskRepository.getChecklistItemsForTask(dataSource, taskId);
        const hasIncompleteRequiredItems = checklistItems.some(item => item.is_required && !item.is_checked);
        if (hasIncompleteRequiredItems) {
            throw new BadRequestException("Cannot complete task: required checklist items are not all checked");
        }
        fieldsToUpdate.completed_date = Date.now();
    }

    fieldsToUpdate.updated_at = Date.now();

    await taskRepository.updateTaskInDb(dataSource, taskId, fieldsToUpdate);

    await logActivity(dataSource, {
        taskId,
        userId: hostId,
        actionType: 'TASK_UPDATED',
        oldValue: JSON.stringify(oldTask),
        newValue: JSON.stringify(fieldsToUpdate)
    });

    return { message: "Task updated successfully" };
};

export const escalateTask = async (hostId, taskId) => {
    const dataSource = await Database.getInstance();
    const task = await taskRepository.getTaskById(dataSource, taskId, hostId);
    if (!task) throw new Error("Task not found or access denied");

    if (computeSlaStatus(task, Date.now()) !== SLA_STATUS.BREACHED) {
        throw new BadRequestException("Task is not breaching its SLA");
    }

    const hostEmail = await getHostEmailById(hostId);
    await sendTaskEscalationEmail(hostEmail, task);

    const escalated_at = Date.now();
    await taskRepository.updateTaskInDb(dataSource, taskId, { escalated_at });

    return { message: "Task escalated successfully" };
};

export const deleteTask = async (hostId, taskId) => {
    const dataSource = await Database.getInstance();
    const task = await taskRepository.getTaskById(dataSource, taskId, hostId);

    if (task?.attachments) {
        try {
            const keys = JSON.parse(task.attachments);
            if (keys.length > 0) {
                await s3.send(new DeleteObjectsCommand({
                    Bucket: BUCKET_NAME,
                    Delete: { Objects: keys.map(key => ({ Key: key })) },
                }));
            }
        } catch { }
    }

    return await updateTask(hostId, taskId, { is_legacy: true });
};

export const getUploadUrl = async (hostId, fileName, fileType) => {
    const ext = fileName.split('.').pop();
    const key = `tasks/${hostId}/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    return {
        uploadUrl,
        key,
    };
};

export const getViewUrl = async (key) => {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });
    return await getSignedUrl(s3, command, { expiresIn: 3600 });
};

const resolveAssigneeName = async (dataSource, hostId, teamMemberId) => {
    const teamMember = await taskRepository.getTeamMemberById(dataSource, teamMemberId, hostId);
    if (!teamMember) {
        throw new BadRequestException("assignee_team_member_id does not belong to this host");
    }
    return teamMember.member_email;
};

const resolveParentTaskId = async (dataSource, hostId, parentTaskId) => {
    const parentTask = await taskRepository.getTaskById(dataSource, parentTaskId, hostId);
    if (!parentTask) {
        throw new BadRequestException("parent_task_id does not belong to this host");
    }
    return parentTaskId;
};

export const logActivity = async (dataSource, { taskId, userId, actionType, oldValue = null, newValue = null }) => {
    const activityRecord = {
        task_id: taskId,
        user_id: userId,
        action_type: actionType,
        old_value: oldValue,
        new_value: newValue,
        created_at: Date.now()
    };

    return await taskRepository.saveActivityToDb(dataSource, activityRecord);
};
