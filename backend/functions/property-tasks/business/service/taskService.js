import * as taskRepository from "../../data/taskRepository.js";
import { validateTaskPayload } from "../model/taskValidator.js";
import Database from "database";

export const getTasks = async (hostId, filters) => {
    const dataSource = await Database.getInstance();
    return await taskRepository.getTasksFromDb(dataSource, hostId, filters);
};


export const createTask = async (Database, hostId, taskData) => {

    validateTaskPayload(taskData);

    const taskRecord = {
        host_id: hostId,
        property_id: taskData.property.propertyId,
        property_snapshot_label: taskData.property.propertyLabel,
        title: taskData.title,
        description: taskData.description || null,
        status: 'Pending',
        priority: taskData.priority || 'Medium',
        due_date: taskData.due_date || null,
        assignee_name: taskData.assignee_name || null,
        created_at: Date.now(),
        updated_at: Date.now()
    };

    const newTask = await taskRepository.saveTaskToDb(Database, taskRecord);

    await logActivity(Database, {
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

    if (updateData.status === 'Completed' && oldTask.status !== 'Completed') {
        updateData.completed_date = Date.now();
    }

    updateData.updated_at = Date.now();

    await taskRepository.updateTaskInDb(dataSource, taskId, updateData);

    await logActivity(dataSource, {
        taskId,
        userId: hostId,
        actionType: 'TASK_UPDATED',
        oldValue: JSON.stringify(oldTask),
        newValue: JSON.stringify(updateData)
    });

    return { message: "Task updated successfully" };
};

export const deleteTask = async (hostId, taskId) => {
    return await updateTask(hostId, taskId, { is_legacy: true });
};

export const logActivity = async (Database, { taskId, userId, actionType, oldValue = null, newValue = null }) => {
    const activityRecord = {
        task_id: taskId,
        user_id: userId,
        action_type: actionType,
        old_value: oldValue,
        new_value: newValue,
        created_at: Date.now()
    };
    
    return await taskRepository.saveActivityToDb(Database, activityRecord);
};