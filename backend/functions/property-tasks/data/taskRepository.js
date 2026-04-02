import { PropertyTask as TaskEntity } from "database/models/Property_Task";
import { Property_Task_Activity as TaskActivityEntity } from "database/models/Property_Task_Activity";

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
        if (task.due_date && task.due_date < now && task.status !== 'Completed') {
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
