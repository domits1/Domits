import Database from "database";
import * as taskRepository from "../../data/taskRepository.js";
import { notifyTaskDueSoon } from "./taskNotificationService.js";
import { sweepTasks } from "./taskSweep.js";

export const notifyDueSoonTasks = async ({ now = Date.now(), limit }) => {
    const dataSource = await Database.getInstance();
    return await sweepTasks({
        label: "due soon",
        findTasks: () => taskRepository.getDueSoonTasksToNotify(dataSource, now, limit),
        claimTask: (task) => taskRepository.claimDueSoonNotification(dataSource, task),
        notifyTask: notifyTaskDueSoon,
    });
};
