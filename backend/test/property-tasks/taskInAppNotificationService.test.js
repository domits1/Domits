jest.mock("database", () => ({
    __esModule: true,
    default: { getInstance: jest.fn(async () => ({})) },
}));

const mockGetNotificationsForUser = jest.fn();
const mockCountUnreadForUser = jest.fn();
const mockMarkNotificationRead = jest.fn();
const mockMarkAllNotificationsRead = jest.fn();

jest.mock("../../functions/property-tasks/data/taskNotificationRepository.js", () => ({
    getNotificationsForUser: (...args) => mockGetNotificationsForUser(...args),
    countUnreadForUser: (...args) => mockCountUnreadForUser(...args),
    markNotificationRead: (...args) => mockMarkNotificationRead(...args),
    markAllNotificationsRead: (...args) => mockMarkAllNotificationsRead(...args),
}));

const {
    listNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} = require("../../functions/property-tasks/business/service/taskInAppNotificationService.js");

describe("listNotifications", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetNotificationsForUser.mockResolvedValue([{ id: "n-1" }, { id: "n-2" }]);
        mockCountUnreadForUser.mockResolvedValue(2);
    });

    it("returns the person's latest notifications and how many are unread", async () => {
        await expect(listNotifications("user-1")).resolves.toEqual({
            notifications: [{ id: "n-1" }, { id: "n-2" }],
            unreadCount: 2,
        });
    });

    it("reads only that person's notifications, 30 at most", async () => {
        await listNotifications("user-1");

        expect(mockGetNotificationsForUser).toHaveBeenCalledWith(expect.anything(), "user-1", 30);
        expect(mockCountUnreadForUser).toHaveBeenCalledWith(expect.anything(), "user-1");
    });
});

describe("markNotificationAsRead", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockMarkNotificationRead.mockResolvedValue(true);
    });

    it("marks the person's notification as read now", async () => {
        const before = Date.now();

        await expect(markNotificationAsRead("user-1", "n-1")).resolves.toEqual({ updated: true });

        const [, id, userId, readAt] = mockMarkNotificationRead.mock.calls[0];
        expect([id, userId]).toEqual(["n-1", "user-1"]);
        expect(readAt).toBeGreaterThanOrEqual(before);
    });

    it("says nothing changed when it was already read or belongs to someone else", async () => {
        mockMarkNotificationRead.mockResolvedValue(false);

        await expect(markNotificationAsRead("user-1", "n-1")).resolves.toEqual({ updated: false });
    });

    it("rejects a request with no notification id", async () => {
        await expect(markNotificationAsRead("user-1", undefined)).rejects.toThrow(/id is required/);

        expect(mockMarkNotificationRead).not.toHaveBeenCalled();
    });
});

describe("markAllNotificationsAsRead", () => {
    it("marks all of the person's unread notifications and says how many changed", async () => {
        mockMarkAllNotificationsRead.mockResolvedValue(4);

        await expect(markAllNotificationsAsRead("user-1")).resolves.toEqual({ updated: 4 });

        expect(mockMarkAllNotificationsRead).toHaveBeenCalledWith(expect.anything(), "user-1", expect.any(Number));
    });
});
