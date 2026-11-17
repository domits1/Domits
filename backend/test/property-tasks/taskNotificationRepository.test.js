import {
    createNotification,
    getNotificationsForUser,
    countUnreadForUser,
    markNotificationRead,
    markAllNotificationsRead,
} from "../../functions/property-tasks/data/taskNotificationRepository.js";

const buildInsertSource = (raw) => {
    const chain = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ raw }),
    };
    return { chain, dataSource: { getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => chain) })) } };
};

const buildUpdateSource = (affected) => {
    const chain = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected }),
    };
    return { chain, dataSource: { getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => chain) })) } };
};

const notification = {
    id: "assigned:task-1:user-1:1000",
    user_id: "user-1",
    host_id: "host-1",
    task_id: "task-1",
    event_type: "assigned",
    title: "Task assigned",
    message: "Clean the villa",
    created_at: 1000,
};

describe("createNotification", () => {
    it("stores the notification and reports that it was created", async () => {
        const { dataSource, chain } = buildInsertSource([{ id: notification.id }]);

        await expect(createNotification(dataSource, notification)).resolves.toBe(true);

        expect(chain.values).toHaveBeenCalledWith(expect.objectContaining({ id: notification.id, user_id: "user-1" }));
    });

    it("starts every notification unread", async () => {
        const { dataSource, chain } = buildInsertSource([{ id: notification.id }]);

        await createNotification(dataSource, notification);

        expect(chain.values).toHaveBeenCalledWith(expect.objectContaining({ read_at: null }));
    });

    it("ignores a duplicate of the same event and reports that nothing was created", async () => {
        const { dataSource, chain } = buildInsertSource([]);

        await expect(createNotification(dataSource, notification)).resolves.toBe(false);

        expect(chain.orIgnore).toHaveBeenCalled();
    });
});

describe("getNotificationsForUser", () => {
    it("returns only that user's notifications, newest first, up to the limit", async () => {
        const find = jest.fn().mockResolvedValue([{ id: "n-1" }]);
        const dataSource = { getRepository: jest.fn(() => ({ find })) };

        await expect(getNotificationsForUser(dataSource, "user-1", 30)).resolves.toEqual([{ id: "n-1" }]);

        expect(find).toHaveBeenCalledWith({ where: { user_id: "user-1" }, order: { created_at: "DESC" }, take: 30 });
    });
});

describe("countUnreadForUser", () => {
    it("counts only that user's notifications that have no read time", async () => {
        const count = jest.fn().mockResolvedValue(3);
        const dataSource = { getRepository: jest.fn(() => ({ count })) };

        await expect(countUnreadForUser(dataSource, "user-1")).resolves.toBe(3);

        const { where } = count.mock.calls[0][0];
        expect(where.user_id).toBe("user-1");
        expect(where.read_at).toBeDefined();
        expect(where.read_at.type).toBe("isNull");
    });
});

describe("markNotificationRead", () => {
    it("marks one unread notification of that user as read", async () => {
        const { dataSource, chain } = buildUpdateSource(1);

        await expect(markNotificationRead(dataSource, "n-1", "user-1", 5000)).resolves.toBe(true);

        expect(chain.set).toHaveBeenCalledWith({ read_at: 5000 });
        expect(chain.where).toHaveBeenCalledWith("id = :id", { id: "n-1" });
        expect(chain.andWhere).toHaveBeenCalledWith("user_id = :userId", { userId: "user-1" });
        expect(chain.andWhere).toHaveBeenCalledWith("read_at IS NULL");
    });

    it("does nothing and reports false for a notification that belongs to someone else", async () => {
        const { dataSource } = buildUpdateSource(0);

        await expect(markNotificationRead(dataSource, "n-1", "someone-else", 5000)).resolves.toBe(false);
    });
});

describe("markAllNotificationsRead", () => {
    it("marks every unread notification of that user as read and returns how many", async () => {
        const { dataSource, chain } = buildUpdateSource(4);

        await expect(markAllNotificationsRead(dataSource, "user-1", 5000)).resolves.toBe(4);

        expect(chain.set).toHaveBeenCalledWith({ read_at: 5000 });
        expect(chain.where).toHaveBeenCalledWith("user_id = :userId", { userId: "user-1" });
        expect(chain.andWhere).toHaveBeenCalledWith("read_at IS NULL");
    });
});
