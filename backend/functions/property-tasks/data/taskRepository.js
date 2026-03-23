import { TaskEntity } from "./taskEntity.js";
import { TaskActivityEntity } from "./taskActivityEntity.js";

export const getTasksFromDb = async (dataSource, hostId, filters) => {
    const repository = dataSource.getRepository(TaskEntity);
    
    let query = repository.createQueryBuilder("task")
        .where("task.host_id = :hostId", { hostId })
        .andWhere("task.is_legacy = :isLegacy", { isLegacy: filters.isLegacy || false });

    if (filters.propertyId) {
        query = query.andWhere("task.property_id = :propertyId", { propertyId: filters.propertyId });
    }

    if (filters.search) {
        query = query.andWhere("(task.title ILIKE :search OR task.description ILIKE :search)", 
            { search: `%${filters.search}%` });
    }

    const sortDir = filters.sortDir === 'desc' ? 'DESC' : 'ASC';
    query = query.orderBy(`task.${filters.sortBy || 'due_date'}`, sortDir);

    return await query.getMany();
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