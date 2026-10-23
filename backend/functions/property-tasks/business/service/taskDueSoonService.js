import Database from "database";
import * as taskRepository from "../../data/taskRepository.js";
import { notifyTaskDueSoon } from "./taskNotificationService.js";
import { sweepTasks } from "./taskSweep.js";

// Runs on a schedule. A task is emailed once for each due date, a day before it is due.
export const notifyDueSoonTasks = async ({ now = Date.now(), limit }) => {
    const dataSource = await Database.getInstance();
    return await sweepTasks({
        label: "due soon",
        findTasks: () => taskRepository.getDueSoonTasksToNotify(dataSource, now, limit),
        claimTask: (task) => taskRepository.claimDueSoonNotification(dataSource, task),
        notifyTask: notifyTaskDueSoon,
    });
};
