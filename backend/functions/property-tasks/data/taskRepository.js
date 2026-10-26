import { PropertyTask as TaskEntity } from "database/models/Property_Task";
import { Property_Task_Activity as TaskActivityEntity } from "database/models/Property_Task_Activity";
import { Property_Task_Checklist_Item as ChecklistItemEntity } from "database/models/Property_Task_Checklist_Item";
import { Team_Member as TeamMemberEntity } from "database/models/Team_Member";
import { Host_Settings as HostSettingsEntity } from "database/models/Host_Settings";

export const getTasksFromDb = async (dataSource, hostId, filters) => {
    const repository = dataSource.getRepository(TaskEntity);
    const now = Date.now();

    const isLegacy = filters.isLegacy === 'true' || filters.isLegacy === true;

    let query = repository.createQueryBuilder("task")
        .where("task.host_id = :hostId", { hostId })
        .andWhere("task.is_legacy = :isLegacy", { isLegacy });

    if (filters.propertyId) {
        query = query.andWhere("task.property_id = :propertyId", { propertyId: filters.propertyId });
    }

    if (filters.status && filters.status !== 'Overdue') {
        query = query.andWhere("task.status = :status", { status: filters.status });
    }

    if (filters.priority) {
        query = query.andWhere("task.priority = :priority", { priority: filters.priority });
    }

    if (filters.assignee) {
        query = query.andWhere("task.assignee_name = :assignee", { assignee: filters.assignee });
    }

    if (filters.assigneeTeamMemberId) {
        query = query.andWhere("task.assignee_team_member_id = :assigneeTeamMemberId", { assigneeTeamMemberId: filters.assigneeTeamMemberId });
    }

    if (filters.dateFrom) {
        query = query.andWhere("task.due_date >= :dateFrom", { dateFrom: Number(filters.dateFrom) });
    }

    if (filters.dateTo) {
        query = query.andWhere("task.due_date <= :dateTo", { dateTo: Number(filters.dateTo) });
    }

    if (filters.search) {
        query = query.andWhere(
            "(task.title ILIKE :search OR task.description ILIKE :search)",
            { search: `%${filters.search}%` }
        );
    }

    const validSortColumns = ['due_date', 'priority', 'status', 'created_at', 'title', 'assignee_name'];
    const sortBy = validSortColumns.includes(filters.sortBy) ? filters.sortBy : 'due_date';
    const sortDir = filters.sortDir === 'desc' ? 'DESC' : 'ASC';
    query = query.orderBy(`task.${sortBy}`, sortDir);

    const tasks = await query.getMany();

    const withOverdue = tasks.map(task => {
        if (task.due_date && task.due_date < now && !['Completed', 'Cancelled'].includes(task.status)) {
            return { ...task, status: 'Overdue', priority: 'Urgent' };
        }
        return task;
    });

    if (filters.status === 'Overdue') {
        return withOverdue.filter(task => task.status === 'Overdue');
    }

    return withOverdue;
};

export const saveTaskToDb = async (dataSource, taskData) => {
    const repository = dataSource.getRepository(TaskEntity);
    return await repository.save(taskData);
};

export const saveActivityToDb = async (dataSource, activityData) => {
    const repository = dataSource.getRepository(TaskActivityEntity);
    return await repository.save(activityData);
};

export const getTaskById = async (dataSource, taskId, hostId) => {
    const repository = dataSource.getRepository(TaskEntity);
    return await repository.findOne({ where: { id: taskId, host_id: hostId } });
};

export const updateTaskInDb = async (dataSource, taskId, updateData) => {
    const repository = dataSource.getRepository(TaskEntity);
    return await repository.update(taskId, updateData);
};

// The write only applies while the task is not completed, so when two requests complete the same
// task at once exactly one of them changes it. Returns false for the one that lost.
export const updateTaskUnlessCompleted = async (dataSource, taskId, updateData) => {
    const repository = dataSource.getRepository(TaskEntity);
    const result = await repository
        .createQueryBuilder()
        .update(TaskEntity)
        .set(updateData)
        .where("id = :taskId", { taskId })
        .andWhere("status <> :completed", { completed: "Completed" })
        .execute();

    return Number(result?.affected || 0) === 1;
};

export const escalateTaskInDb = async (dataSource, taskId, hostId, escalatedAt) => {
    const repository = dataSource.getRepository(TaskEntity);
    const result = await repository
        .createQueryBuilder()
        .update(TaskEntity)
        .set({ escalated_at: escalatedAt })
        .where("id = :taskId", { taskId })
        .andWhere("host_id = :hostId", { hostId })
        .andWhere("escalated_at IS NULL")
        .execute();

    return Number(result?.affected || 0) === 1;
};

const claimCompletedTask = async (dataSource, taskId, hostId, fieldsToSet) => {
    const repository = dataSource.getRepository(TaskEntity);
    const result = await repository
        .createQueryBuilder()
        .update(TaskEntity)
        .set(fieldsToSet)
        .where("id = :taskId", { taskId })
        .andWhere("host_id = :hostId", { hostId })
        .andWhere("status = :completed", { completed: "Completed" })
        .andWhere("approved_at IS NULL")
        .execute();

    return Number(result?.affected || 0) === 1;
};

export const approveCompletedTaskInDb = async (dataSource, taskId, hostId, approvedAt) =>
    await claimCompletedTask(dataSource, taskId, hostId, { approved_at: approvedAt });

export const rejectCompletedTaskInDb = async (dataSource, taskId, hostId, rejectedAt) =>
    await claimCompletedTask(dataSource, taskId, hostId, {
        status: "In progress",
        completed_date: null,
        updated_at: rejectedAt,
    });

const RESOLVED_STATUSES = ["Completed", "Cancelled"];
const DAY_MS = 24 * 60 * 60 * 1000;
const FIRST_EMAIL_WINDOW_MS = DAY_MS;
const REMINDER_INTERVAL_MS = 2 * DAY_MS;
const MAX_OVERDUE_EMAILS = 4;

export const getOverdueTasksToNotify = async (dataSource, now, limit) => {
    const repository = dataSource.getRepository(TaskEntity);
    return await repository.createQueryBuilder("task")
        .where("task.due_date < :now", { now })
        .andWhere("task.status NOT IN (:...resolved)", { resolved: RESOLVED_STATUSES })
        .andWhere(
            "((task.overdue_last_notified_at IS NULL AND task.due_date >= :since)"
            + " OR (task.overdue_last_notified_at <= :remindBefore AND COALESCE(task.overdue_notify_count, 0) < :maxNotifications))",
            {
                since: now - FIRST_EMAIL_WINDOW_MS,
                remindBefore: now - REMINDER_INTERVAL_MS,
                maxNotifications: MAX_OVERDUE_EMAILS,
            }
        )
        .andWhere("task.escalated_at IS NULL")
        .andWhere("task.is_legacy = false")
        .orderBy("task.overdue_last_notified_at", "ASC", "NULLS FIRST")
        .limit(limit)
        .getMany();
};

export const claimOverdueNotification = async (dataSource, task, claimedAt) => {
    const repository = dataSource.getRepository(TaskEntity);
    const previous = task.overdue_last_notified_at;
    const query = repository
        .createQueryBuilder()
        .update(TaskEntity)
        .set({
            overdue_last_notified_at: claimedAt,
            overdue_notify_count: () => "COALESCE(overdue_notify_count, 0) + 1",
        })
        .where("id = :taskId", { taskId: task.id });

    const result = await (previous === null || previous === undefined
        ? query.andWhere("overdue_last_notified_at IS NULL")
        : query.andWhere("overdue_last_notified_at = :previous", { previous })
    ).execute();

    return Number(result?.affected || 0) === 1;
};

export const getChecklistItemsForTask = async (dataSource, taskId) => {
    const repository = dataSource.getRepository(ChecklistItemEntity);
    return await repository.find({ where: { task_id: taskId }, order: { position: "ASC" } });
};

export const getChecklistItemById = async (dataSource, itemId) => {
    const repository = dataSource.getRepository(ChecklistItemEntity);
    return await repository.findOne({ where: { id: itemId } });
};

export const saveChecklistItemToDb = async (dataSource, itemData) => {
    const repository = dataSource.getRepository(ChecklistItemEntity);
    return await repository.save(itemData);
};

export const updateChecklistItemInDb = async (dataSource, itemId, updateData) => {
    const repository = dataSource.getRepository(ChecklistItemEntity);
    return await repository.update(itemId, updateData);
};

export const deleteChecklistItemFromDb = async (dataSource, itemId) => {
    const repository = dataSource.getRepository(ChecklistItemEntity);
    return await repository.delete(itemId);
};

export const getTeamMemberById = async (dataSource, teamMemberId, hostId) => {
    const repository = dataSource.getRepository(TeamMemberEntity);
    return await repository.findOne({ where: { id: teamMemberId, host_id: hostId } });
};

// host-settings stores one row per logged-in user (its host_id is the Cognito username),
// so a team member has their own row and is looked up by their own user id.
export const getHostSettings = async (dataSource, userId) => {
    const repository = dataSource.getRepository(HostSettingsEntity);
    return await repository.findOne({ where: { host_id: userId } });
};
