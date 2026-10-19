import Database from "database";
import * as taskRepository from "../../data/taskRepository.js";
import { notifyTaskOverdue } from "./taskNotificationService.js";

// Runs on a schedule. Each task is claimed before its email goes out, so overlapping runs
// cannot send twice. A failed email is not retried straight away: the claim is kept, and the
// next reminder comes when the reminder interval has passed.
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
