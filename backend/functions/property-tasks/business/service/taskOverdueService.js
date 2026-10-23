import Database from "database";
import * as taskRepository from "../../data/taskRepository.js";
import { notifyTaskOverdue } from "./taskNotificationService.js";
import { sweepTasks } from "./taskSweep.js";

export const notifyOverdueTasks = async ({ now = Date.now(), limit }) => {
    const dataSource = await Database.getInstance();
    return await sweepTasks({
        label: "overdue",
        findTasks: () => taskRepository.getOverdueTasksToNotify(dataSource, now, limit),
        claimTask: (task) => taskRepository.claimOverdueNotification(dataSource, task, now),
        notifyTask: notifyTaskOverdue,
    });
};
