import Database from "database";
import * as notificationRepository from "../../data/taskNotificationRepository.js";
import { BadRequestException } from "../../util/exception/badRequestException.js";

const LIST_LIMIT = 30;

export const listNotifications = async (userId) => {
    const dataSource = await Database.getInstance();
    const [notifications, unreadCount] = await Promise.all([
        notificationRepository.getNotificationsForUser(dataSource, userId, LIST_LIMIT),
        notificationRepository.countUnreadForUser(dataSource, userId),
    ]);
    return { notifications, unreadCount };
};

export const markNotificationAsRead = async (userId, notificationId) => {
    if (!notificationId) {
        throw new BadRequestException("id is required");
    }
    const dataSource = await Database.getInstance();
    const updated = await notificationRepository.markNotificationRead(dataSource, notificationId, userId, Date.now());
    return { updated };
};

export const markAllNotificationsAsRead = async (userId) => {
    const dataSource = await Database.getInstance();
    const updated = await notificationRepository.markAllNotificationsRead(dataSource, userId, Date.now());
    return { updated };
};
