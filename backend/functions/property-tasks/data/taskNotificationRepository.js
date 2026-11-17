import { IsNull } from "typeorm";
import { Task_Notification as NotificationEntity } from "database/models/Task_Notification";

export const createNotification = async (dataSource, notification) => {
    const repository = dataSource.getRepository(NotificationEntity);
    const result = await repository
        .createQueryBuilder()
        .insert()
        .into(NotificationEntity)
        .values({ ...notification, read_at: null })
        .orIgnore()
        .returning("id")
        .execute();

    return Array.isArray(result?.raw) && result.raw.length === 1;
};

export const getNotificationsForUser = async (dataSource, userId, limit) => {
    const repository = dataSource.getRepository(NotificationEntity);
    return await repository.find({ where: { user_id: userId }, order: { created_at: "DESC" }, take: limit });
};

export const countUnreadForUser = async (dataSource, userId) => {
    const repository = dataSource.getRepository(NotificationEntity);
    return await repository.count({ where: { user_id: userId, read_at: IsNull() } });
};

export const markNotificationRead = async (dataSource, notificationId, userId, readAt) => {
    const repository = dataSource.getRepository(NotificationEntity);
    const result = await repository
        .createQueryBuilder()
        .update(NotificationEntity)
        .set({ read_at: readAt })
        .where("id = :id", { id: notificationId })
        .andWhere("user_id = :userId", { userId })
        .andWhere("read_at IS NULL")
        .execute();

    return Number(result?.affected || 0) === 1;
};

export const markAllNotificationsRead = async (dataSource, userId, readAt) => {
    const repository = dataSource.getRepository(NotificationEntity);
    const result = await repository
        .createQueryBuilder()
        .update(NotificationEntity)
        .set({ read_at: readAt })
        .where("user_id = :userId", { userId })
        .andWhere("read_at IS NULL")
        .execute();

    return Number(result?.affected || 0);
};
