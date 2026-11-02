jest.mock("database", () => require("./taskRepositoryTestDoubles.js").databaseMock);
jest.mock("../../functions/property-tasks/data/taskRepository.js", () => require("./taskRepositoryTestDoubles.js").taskRepositoryMock);

const {
    mockGetTaskById,
    mockUpdateTaskInDb,
    resetTaskRepositoryMocks,
} = require("./taskRepositoryTestDoubles.js");

const { updateTask } = require("../../functions/property-tasks/business/service/taskService.js");

const approvedTask = { id: "task-1", host_id: "host-1", status: "Completed", approved_at: 1700000000000, due_date: null };

const savedFields = () => mockUpdateTaskInDb.mock.calls[0][2];

describe("updateTask and approval", () => {
    beforeEach(() => {
        resetTaskRepositoryMocks();
        mockGetTaskById.mockResolvedValue(approvedTask);
    });

    it("ignores an approved_at sent through the generic update, so nobody can approve a task by editing it", async () => {
        await updateTask("host-1", "task-1", { approved_at: Date.now(), title: "Renamed" });

        expect(savedFields()).not.toHaveProperty("approved_at", expect.any(Number));
        expect(savedFields()).toHaveProperty("title", "Renamed");
    });

    it("keeps the approval when the task stays completed and only something else changes", async () => {
        await updateTask("host-1", "task-1", { status: "Completed", description: "More detail" });

        expect(savedFields()).not.toHaveProperty("approved_at");
    });

    it.each(["Pending", "In progress"])("clears the approval when the task is moved to %s, so completing it again needs a new approval", async (status) => {
        await updateTask("host-1", "task-1", { status });

        expect(savedFields()).toHaveProperty("approved_at", null);
    });
});
