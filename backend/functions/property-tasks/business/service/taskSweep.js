export const sweepTasks = async ({ label, findTasks, claimTask, notifyTask }) => {
    const tasks = await findTasks();

    let claimed = 0;
    for (const task of tasks) {
        if (!(await claimTask(task))) {
            continue;
        }
        claimed += 1;
        try {
            await notifyTask(task);
        } catch (error) {
            console.error(`Failed to notify about ${label} task ${task.id}`, error);
        }
    }

    return { found: tasks.length, claimed };
};
