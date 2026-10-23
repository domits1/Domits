import Database from "database";
import * as taskRepository from "../../data/taskRepository.js";
import { notifyTaskOverdue } from "./taskNotificationService.js";

export const notifyOverdueTasks = async ({ now = Date.now(), limit }) => {
    const dataSource = await Database.getInstance();
    const tasks = await taskRepository.getOverdueTasksToNotify(dataSource, now, limit);

    let claimed = 0;
    for (const task of tasks) {
        if (!(await taskRepository.claimOverdueNotification(dataSource, task, now))) {
            continue;
        }
        claimed += 1;
        try {
            await notifyTaskOverdue(task);
        } catch (error) {
            console.error(`Failed to notify about overdue task ${task.id}`, error);
        }
    }

    return { found: tasks.length, claimed };
};
