import * as taskRepository from "../../data/taskRepository.js";
import { validateTaskPayload } from "../model/taskValidator.js";
import Database from "database";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

const s3 = new S3Client({ region: "eu-north-1" });
const BUCKET_NAME = "domits-task-attachments";

export const getTasks = async (hostId, filters) => {
    const dataSource = await Database.getInstance();
    return await taskRepository.getTasksFromDb(dataSource, hostId, filters);
};

export const createTask = async (hostId, taskData) => {
    const dataSource = await Database.getInstance();

    validateTaskPayload(taskData);

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
        assignee_name: taskData.assignee_name || null,
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

    if (fieldsToUpdate.due_date) {
        fieldsToUpdate.due_date = new Date(fieldsToUpdate.due_date).getTime();
    }

    if (fieldsToUpdate.status === 'Completed' && oldTask.status !== 'Completed') {
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

export const deleteTask = async (hostId, taskId) => {
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
        fileUrl: `https://${BUCKET_NAME}.s3.eu-north-1.amazonaws.com/${key}`,
        key,
    };
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
