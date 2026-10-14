jest.mock("database", () => require("./taskRepositoryTestDoubles.js").databaseMock);
jest.mock("../../functions/property-tasks/data/taskRepository.js", () => require("./taskRepositoryTestDoubles.js").taskRepositoryMock);

const {
    mockGetTaskById,
    mockUpdateTaskInDb,
    resetTaskRepositoryMocks,
} = require("./taskRepositoryTestDoubles.js");

const { updateTask } = require("../../functions/property-tasks/business/service/taskService.js");

describe("task lifecycle", () => {
    beforeEach(() => {
        resetTaskRepositoryMocks();
    });

    it("rejects an unknown status value", async () => {
        mockGetTaskById.mockResolvedValue({ id: "task-1", host_id: "host-1", status: "Pending", due_date: null });

        await expect(
            updateTask("host-1", "task-1", { status: "Archived" })
        ).rejects.toThrow(/Invalid status/);

        expect(mockUpdateTaskInDb).not.toHaveBeenCalled();
    });

    it.each(["Pending", "In progress", "Completed"])(
        "rejects moving a Cancelled task to %s",
        async (nextStatus) => {
            mockGetTaskById.mockResolvedValue({ id: "task-1", host_id: "host-1", status: "Cancelled", due_date: null });

            await expect(
                updateTask("host-1", "task-1", { status: nextStatus })
            ).rejects.toThrow(/Cancelled tasks cannot change status/);

            expect(mockUpdateTaskInDb).not.toHaveBeenCalled();
        }
    );

    it("allows re-saving Cancelled on an already-Cancelled task", async () => {
        mockGetTaskById.mockResolvedValue({ id: "task-1", host_id: "host-1", status: "Cancelled", due_date: null });

        await updateTask("host-1", "task-1", { status: "Cancelled" });

        expect(mockUpdateTaskInDb).toHaveBeenCalledWith(
            expect.anything(), "task-1", expect.objectContaining({ status: "Cancelled" })
        );
    });

    it.each([
        ["Pending", "In progress"],
        ["Pending", "Completed"],
        ["Pending", "Cancelled"],
        ["In progress", "Completed"],
        ["In progress", "Cancelled"],
        ["Completed", "Pending"],
    ])("allows moving from %s to %s", async (currentStatus, nextStatus) => {
        mockGetTaskById.mockResolvedValue({ id: "task-1", host_id: "host-1", status: currentStatus, due_date: null });

        await updateTask("host-1", "task-1", { status: nextStatus });

        expect(mockUpdateTaskInDb).toHaveBeenCalledWith(
            expect.anything(), "task-1", expect.objectContaining({ status: nextStatus })
        );
    });
});
