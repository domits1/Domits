jest.mock("database", () => ({
    __esModule: true,
    default: { getInstance: jest.fn(async () => ({})) },
}));

const mockFindDueSoon = jest.fn();
const mockClaimDueSoon = jest.fn();
const mockEmailDueSoon = jest.fn();

jest.mock("../../functions/property-tasks/data/taskRepository.js", () => ({
    getDueSoonTasksToNotify: (...args) => mockFindDueSoon(...args),
    claimDueSoonNotification: (...args) => mockClaimDueSoon(...args),
}));

jest.mock("../../functions/property-tasks/business/service/taskNotificationService.js", () => ({
    notifyTaskDueSoon: (...args) => mockEmailDueSoon(...args),
}));

const { notifyDueSoonTasks } = require("../../functions/property-tasks/business/service/taskDueSoonService.js");

describe("notifyDueSoonTasks", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFindDueSoon.mockResolvedValue([{ id: "task-1" }]);
        mockClaimDueSoon.mockResolvedValue(true);
        mockEmailDueSoon.mockResolvedValue();
    });

    it("asks for the tasks due soon as of now, up to the limit", async () => {
        await notifyDueSoonTasks({ now: 5000, limit: 7 });

        expect(mockFindDueSoon).toHaveBeenCalledWith(expect.anything(), 5000, 7);
    });

    it("claims a task before it emails about it, and reports what it found and claimed", async () => {
        const result = await notifyDueSoonTasks({ now: 5000, limit: 7 });

        expect(mockClaimDueSoon).toHaveBeenCalledWith(expect.anything(), { id: "task-1" });
        expect(mockClaimDueSoon.mock.invocationCallOrder[0]).toBeLessThan(mockEmailDueSoon.mock.invocationCallOrder[0]);
        expect(mockEmailDueSoon).toHaveBeenCalledWith({ id: "task-1" });
        expect(result).toEqual({ found: 1, claimed: 1 });
    });

    it("does not email about a task that another run already claimed", async () => {
        mockClaimDueSoon.mockResolvedValue(false);

        const result = await notifyDueSoonTasks({ now: 5000, limit: 7 });

        expect(mockEmailDueSoon).not.toHaveBeenCalled();
        expect(result).toEqual({ found: 1, claimed: 0 });
    });
});
