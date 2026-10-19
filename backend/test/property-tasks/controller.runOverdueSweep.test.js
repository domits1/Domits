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

const { Controller } = require("../../functions/property-tasks/controller/controller.js");
const { notifyOverdueTasks } = require("../../functions/property-tasks/business/service/taskOverdueService.js");

describe("Controller.runOverdueSweep", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        notifyOverdueTasks.mockResolvedValue({ found: 3, claimed: 2 });
    });

    it("runs the sweep and reports how many tasks it found and claimed", async () => {
        const response = await new Controller().runOverdueSweep({ task: "notify-overdue-tasks", limit: 5 });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ found: 3, claimed: 2 });
        expect(notifyOverdueTasks).toHaveBeenCalledWith({ limit: 5 });
    });

    it.each([
        ["is missing", undefined, 20],
        ["is not a number", "lots", 20],
        ["is zero or negative", 0, 20],
        ["is above the cap", 5000, 100],
    ])("uses a safe limit when the limit %s", async (_label, limit, expected) => {
        await new Controller().runOverdueSweep({ task: "notify-overdue-tasks", limit });

        expect(notifyOverdueTasks).toHaveBeenCalledWith({ limit: expected });
    });

    it("answers with an error status when the sweep fails", async () => {
        notifyOverdueTasks.mockRejectedValue(new Error("database down"));

        const response = await new Controller().runOverdueSweep({ task: "notify-overdue-tasks", limit: 5 });

        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.body).message).toContain("database down");
    });
});
