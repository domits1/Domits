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

describe("updateTask escalated_at protection", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetTaskById.mockResolvedValue({ id: "task-1", host_id: "host-1", status: "Pending" });
        mockUpdateTaskInDb.mockResolvedValue();
        mockSaveActivityToDb.mockResolvedValue();
        mockGetChecklistItemsForTask.mockResolvedValue([]);
    });

    it("ignores an escalated_at field sent through the generic update", async () => {
        await updateTask("host-1", "task-1", { escalated_at: Date.now(), title: "Renamed" });

        const [, , fieldsToUpdate] = mockUpdateTaskInDb.mock.calls[0];
        expect(fieldsToUpdate).not.toHaveProperty("escalated_at");
        expect(fieldsToUpdate.title).toBe("Renamed");
    });
});
