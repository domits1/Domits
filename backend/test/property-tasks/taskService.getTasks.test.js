jest.mock("database", () => ({
    __esModule: true,
    default: { getInstance: jest.fn(async () => ({})) },
}));

const mockGetTasksFromDb = jest.fn();

jest.mock("../../functions/property-tasks/data/taskRepository.js", () => ({
    getTasksFromDb: (...args) => mockGetTasksFromDb(...args),
}));

const { getTasks } = require("../../functions/property-tasks/business/service/taskService.js");

describe("taskService.getTasks", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("adds sla_status to each returned task", async () => {
        const now = Date.now();
        mockGetTasksFromDb.mockResolvedValue([
            { id: "task-1", status: "Pending", due_date: now - 1000 },
            { id: "task-2", status: "Completed", due_date: now - 1000 },
        ]);

        const result = await getTasks("host-1", {});

        expect(result[0]).toMatchObject({ id: "task-1", sla_status: "BREACHED" });
        expect(result[1]).toMatchObject({ id: "task-2", sla_status: null });
    });

    it("passes hostId and filters through to the repository", async () => {
        mockGetTasksFromDb.mockResolvedValue([]);

        await getTasks("host-1", { status: "Pending" });

        expect(mockGetTasksFromDb).toHaveBeenCalledWith(expect.anything(), "host-1", { status: "Pending" });
    });
});
