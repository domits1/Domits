// The sweep never calls these services. They are replaced only so loading the controller does not load the database.
jest.mock("../../functions/property-tasks/business/service/taskService.js", () => ({}));
jest.mock("../../functions/property-tasks/business/service/taskChecklistService.js", () => ({}));

jest.mock("../../functions/property-tasks/business/service/taskOverdueService.js", () => ({
    notifyOverdueTasks: jest.fn(),
}));

jest.mock("../../functions/property-tasks/business/service/taskDueSoonService.js", () => ({
    notifyDueSoonTasks: jest.fn(),
}));

const { Controller } = require("../../functions/property-tasks/controller/controller.js");
const { notifyOverdueTasks } = require("../../functions/property-tasks/business/service/taskOverdueService.js");
const { notifyDueSoonTasks } = require("../../functions/property-tasks/business/service/taskDueSoonService.js");

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

describe("Controller.runDueSoonSweep", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        notifyDueSoonTasks.mockResolvedValue({ found: 4, claimed: 3 });
    });

    it("runs the due soon sweep with the same limit rules as the overdue one", async () => {
        const response = await new Controller().runDueSoonSweep({ task: "notify-due-soon-tasks", limit: 5000 });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ found: 4, claimed: 3 });
        expect(notifyDueSoonTasks).toHaveBeenCalledWith({ limit: 100 });
        expect(notifyOverdueTasks).not.toHaveBeenCalled();
    });

    it("answers with an error status when the sweep fails", async () => {
        notifyDueSoonTasks.mockRejectedValue(new Error("database down"));

        const response = await new Controller().runDueSoonSweep({ task: "notify-due-soon-tasks", limit: 5 });

        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.body).message).toContain("database down");
    });
});
