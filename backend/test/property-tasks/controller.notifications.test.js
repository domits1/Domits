jest.mock("../../functions/property-tasks/business/service/taskService.js", () => ({
    getTasks: jest.fn(),
    createTask: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
    getUploadUrl: jest.fn(),
    getViewUrl: jest.fn(),
    escalateTask: jest.fn(),
}));

jest.mock("../../functions/property-tasks/business/service/taskChecklistService.js", () => ({
    getChecklistItems: jest.fn(),
    createChecklistItem: jest.fn(),
    updateChecklistItem: jest.fn(),
    deleteChecklistItem: jest.fn(),
}));

jest.mock("../../functions/property-tasks/business/service/taskOverdueService.js", () => ({
    notifyOverdueTasks: jest.fn(),
}));

jest.mock("../../functions/property-tasks/business/service/taskInAppNotificationService.js", () => ({
    listNotifications: jest.fn(),
    markNotificationAsRead: jest.fn(),
    markAllNotificationsAsRead: jest.fn(),
}));

const mockGetUser = jest.fn();
jest.mock("../../functions/property-tasks/auth/authManager.js", () => ({
    AuthManager: jest.fn().mockImplementation(() => ({ getUser: mockGetUser })),
}));

const { Controller } = require("../../functions/property-tasks/controller/controller.js");
const {
    listNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} = require("../../functions/property-tasks/business/service/taskInAppNotificationService.js");
const { UnauthorizedException } = require("../../functions/property-tasks/util/exception/unauthorizedException.js");

const event = (overrides = {}) => ({ headers: { Authorization: "token-1" }, queryStringParameters: {}, ...overrides });

describe("notification endpoints", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetUser.mockResolvedValue({ username: "user-1", role: "Property Operations Manager" });
    });

    describe("getNotifications", () => {
        it("returns the signed-in person's own notifications, not the host's", async () => {
            listNotifications.mockResolvedValue({ notifications: [{ id: "n-1" }], unreadCount: 1 });

            const response = await new Controller().getNotifications(event());

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual({ notifications: [{ id: "n-1" }], unreadCount: 1 });
            expect(listNotifications).toHaveBeenCalledWith("user-1");
        });

        it("answers 401 without a valid token", async () => {
            mockGetUser.mockRejectedValue(new UnauthorizedException("Invalid or expired authorization token."));

            const response = await new Controller().getNotifications(event());

            expect(response.statusCode).toBe(401);
            expect(listNotifications).not.toHaveBeenCalled();
        });
    });

    describe("markNotificationRead", () => {
        it("marks the notification named in the query as the signed-in person's", async () => {
            markNotificationAsRead.mockResolvedValue({ updated: true });

            const response = await new Controller().markNotificationRead(event({ queryStringParameters: { id: "n-1" } }));

            expect(response.statusCode).toBe(200);
            expect(markNotificationAsRead).toHaveBeenCalledWith("user-1", "n-1");
        });

        it("answers 400 when no id is given", async () => {
            markNotificationAsRead.mockRejectedValue(Object.assign(new Error("id is required"), { statusCode: 400 }));

            const response = await new Controller().markNotificationRead(event());

            expect(response.statusCode).toBe(400);
        });
    });

    describe("markAllNotificationsRead", () => {
        it("marks all of the signed-in person's notifications as read", async () => {
            markAllNotificationsAsRead.mockResolvedValue({ updated: 3 });

            const response = await new Controller().markAllNotificationsRead(event());

            expect(JSON.parse(response.body)).toEqual({ updated: 3 });
            expect(markAllNotificationsAsRead).toHaveBeenCalledWith("user-1");
        });
    });
});
