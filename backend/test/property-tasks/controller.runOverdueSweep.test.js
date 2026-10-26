// The sweep never calls these services. They are replaced only so loading the controller does not load the database.
jest.mock("../../functions/property-tasks/business/service/taskService.js", () => ({}));
jest.mock("../../functions/property-tasks/business/service/taskChecklistService.js", () => ({}));

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

    it("logs the error and throws when the sweep fails, so the scheduled run fails and the alarm can fire", async () => {
        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        notifyOverdueTasks.mockRejectedValue(new Error("database down"));

        await expect(
            new Controller().runOverdueSweep({ task: "notify-overdue-tasks", limit: 5 })
        ).rejects.toThrow("database down");

        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("overdue sweep"), expect.any(Error));
        consoleErrorSpy.mockRestore();
    });
});
