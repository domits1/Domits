jest.mock("database", () => ({
    __esModule: true,
    default: { getInstance: jest.fn(async () => ({})) },
}));

const mockGetOverdueTasksToNotify = jest.fn();
const mockClaimOverdueNotification = jest.fn();

jest.mock("../../functions/property-tasks/data/taskRepository.js", () => ({
    getOverdueTasksToNotify: (...args) => mockGetOverdueTasksToNotify(...args),
    claimOverdueNotification: (...args) => mockClaimOverdueNotification(...args),
}));

const mockNotifyTaskOverdue = jest.fn();

jest.mock("../../functions/property-tasks/business/service/taskNotificationService.js", () => ({
    notifyTaskOverdue: (...args) => mockNotifyTaskOverdue(...args),
}));

const { notifyOverdueTasks } = require("../../functions/property-tasks/business/service/taskOverdueService.js");

describe("notifyOverdueTasks", () => {
    let consoleErrorSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        mockGetOverdueTasksToNotify.mockResolvedValue([]);
        mockClaimOverdueNotification.mockResolvedValue(true);
        mockNotifyTaskOverdue.mockResolvedValue();
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it("asks for the overdue tasks as of now, up to the limit", async () => {
        await notifyOverdueTasks({ now: 5000, limit: 7 });

        expect(mockGetOverdueTasksToNotify).toHaveBeenCalledWith(expect.anything(), 5000, 7);
    });

    it("claims a task before it emails about it", async () => {
        mockGetOverdueTasksToNotify.mockResolvedValue([{ id: "task-1" }]);

        await notifyOverdueTasks({ now: 5000, limit: 7 });

        expect(mockClaimOverdueNotification).toHaveBeenCalledWith(expect.anything(), { id: "task-1" }, 5000);
        expect(mockClaimOverdueNotification.mock.invocationCallOrder[0])
            .toBeLessThan(mockNotifyTaskOverdue.mock.invocationCallOrder[0]);
        expect(mockNotifyTaskOverdue).toHaveBeenCalledWith({ id: "task-1" });
    });

    it("skips a task that another run already claimed", async () => {
        mockGetOverdueTasksToNotify.mockResolvedValue([{ id: "task-1" }, { id: "task-2" }]);
        mockClaimOverdueNotification.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

        const result = await notifyOverdueTasks({ now: 5000, limit: 7 });

        expect(mockNotifyTaskOverdue).toHaveBeenCalledTimes(1);
        expect(mockNotifyTaskOverdue).toHaveBeenCalledWith({ id: "task-2" });
        expect(result).toEqual({ found: 2, claimed: 1 });
    });

    it("keeps going, and does not release the claim, when one task fails unexpectedly", async () => {
        mockGetOverdueTasksToNotify.mockResolvedValue([{ id: "task-1" }, { id: "task-2" }]);
        mockNotifyTaskOverdue.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce();

        const result = await notifyOverdueTasks({ now: 5000, limit: 7 });

        expect(mockNotifyTaskOverdue).toHaveBeenCalledTimes(2);
        expect(mockClaimOverdueNotification).toHaveBeenCalledTimes(2);
        expect(result).toEqual({ found: 2, claimed: 2 });
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("task-1"), expect.any(Error));
    });

    it("does nothing when no task is overdue", async () => {
        const result = await notifyOverdueTasks({ now: 5000, limit: 7 });

        expect(mockClaimOverdueNotification).not.toHaveBeenCalled();
        expect(result).toEqual({ found: 0, claimed: 0 });
    });
});
