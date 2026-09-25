jest.mock("database", () => ({
    __esModule: true,
    default: { getInstance: jest.fn(async () => ({})) },
}));

const mockGetTaskById = jest.fn();
const mockUpdateTaskInDb = jest.fn();
const mockSaveActivityToDb = jest.fn();

jest.mock("../../functions/property-tasks/data/taskRepository.js", () => ({
    getTaskById: (...args) => mockGetTaskById(...args),
    updateTaskInDb: (...args) => mockUpdateTaskInDb(...args),
    saveActivityToDb: (...args) => mockSaveActivityToDb(...args),
}));

const { updateTask } = require("../../functions/property-tasks/business/service/taskService.js");

const PAST_DUE_DATE = new Date("2020-01-01").getTime();

describe("updateTask due_date validation", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUpdateTaskInDb.mockResolvedValue();
        mockSaveActivityToDb.mockResolvedValue();
    });

    it("does not re-validate due_date when it is unchanged on an already-overdue task", async () => {
        mockGetTaskById.mockResolvedValue({
            id: "task-1",
            host_id: "host-1",
            status: "Pending",
            due_date: PAST_DUE_DATE,
        });

        await expect(
            updateTask("host-1", "task-1", { due_date: PAST_DUE_DATE, status: "Completed" })
        ).resolves.toEqual({ message: "Task updated successfully" });

        expect(mockUpdateTaskInDb).toHaveBeenCalledTimes(1);
    });

    it("still throws when due_date is changed to a new past date", async () => {
        mockGetTaskById.mockResolvedValue({
            id: "task-1",
            host_id: "host-1",
            status: "Pending",
            due_date: PAST_DUE_DATE,
        });

        const newerPastDate = new Date("2020-02-01").getTime();

        await expect(
            updateTask("host-1", "task-1", { due_date: newerPastDate })
        ).rejects.toThrow("due_date cannot be in the past");

        expect(mockUpdateTaskInDb).not.toHaveBeenCalled();
    });

    it("throws when due_date is newly set to a past date on a task that had none", async () => {
        mockGetTaskById.mockResolvedValue({
            id: "task-1",
            host_id: "host-1",
            status: "Pending",
            due_date: null,
        });

        await expect(
            updateTask("host-1", "task-1", { due_date: PAST_DUE_DATE })
        ).rejects.toThrow("due_date cannot be in the past");

        expect(mockUpdateTaskInDb).not.toHaveBeenCalled();
    });
});
