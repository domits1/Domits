jest.mock("database", () => ({
    __esModule: true,
    default: { getInstance: jest.fn(async () => ({})) },
}));

const mockGetTaskById = jest.fn();
const mockUpdateTaskInDb = jest.fn();
const mockSaveActivityToDb = jest.fn();
const mockGetChecklistItemsForTask = jest.fn();

jest.mock("../../functions/property-tasks/data/taskRepository.js", () => ({
    getTaskById: (...args) => mockGetTaskById(...args),
    updateTaskInDb: (...args) => mockUpdateTaskInDb(...args),
    saveActivityToDb: (...args) => mockSaveActivityToDb(...args),
    getChecklistItemsForTask: (...args) => mockGetChecklistItemsForTask(...args),
}));

const { updateTask } = require("../../functions/property-tasks/business/service/taskService.js");

describe("updateTask - checklist completion gate", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetTaskById.mockResolvedValue({ id: "task-1", host_id: "host-1", status: "Pending", due_date: null });
        mockUpdateTaskInDb.mockResolvedValue();
        mockSaveActivityToDb.mockResolvedValue();
    });

    it("rejects completing a task with an unchecked required checklist item", async () => {
        mockGetChecklistItemsForTask.mockResolvedValue([
            { id: "item-1", is_required: true, is_checked: false },
        ]);

        await expect(
            updateTask("host-1", "task-1", { status: "Completed" })
        ).rejects.toThrow(/required checklist items are not all checked/);

        expect(mockUpdateTaskInDb).not.toHaveBeenCalled();
    });

    it("allows completing a task when all required items are checked", async () => {
        mockGetChecklistItemsForTask.mockResolvedValue([
            { id: "item-1", is_required: true, is_checked: true },
            { id: "item-2", is_required: false, is_checked: false },
        ]);

        await expect(
            updateTask("host-1", "task-1", { status: "Completed" })
        ).resolves.toEqual({ message: "Task updated successfully" });
    });

    it("allows completing a task with no checklist items at all", async () => {
        mockGetChecklistItemsForTask.mockResolvedValue([]);

        await expect(
            updateTask("host-1", "task-1", { status: "Completed" })
        ).resolves.toEqual({ message: "Task updated successfully" });
    });

    it("does not check the gate when the task is already Completed (no-op update)", async () => {
        mockGetTaskById.mockResolvedValue({ id: "task-1", host_id: "host-1", status: "Completed", due_date: null });

        await updateTask("host-1", "task-1", { status: "Completed" });

        expect(mockGetChecklistItemsForTask).not.toHaveBeenCalled();
    });

    it("does not check the gate for updates unrelated to status", async () => {
        await updateTask("host-1", "task-1", { title: "Renamed" });

        expect(mockGetChecklistItemsForTask).not.toHaveBeenCalled();
    });
});
