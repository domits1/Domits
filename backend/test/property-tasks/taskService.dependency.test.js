jest.mock("database", () => require("./taskRepositoryTestDoubles.js").databaseMock);
jest.mock("../../functions/property-tasks/data/taskRepository.js", () => require("./taskRepositoryTestDoubles.js").taskRepositoryMock);

const {
    mockGetTaskById,
    mockSaveTaskToDb,
    mockUpdateTaskInDb,
    resetTaskRepositoryMocks,
} = require("./taskRepositoryTestDoubles.js");

const { createTask, updateTask } = require("../../functions/property-tasks/business/service/taskService.js");

const baseTaskData = {
    property_id: "prop-1",
    property_snapshot_label: "Villa Sunshine",
    title: "Inspect the pool",
    type: "Inspection",
};

const PARENT_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("task dependency", () => {
    beforeEach(() => {
        resetTaskRepositoryMocks();
    });

    describe("createTask", () => {
        it("rejects a parent_task_id that does not belong to this host", async () => {
            mockGetTaskById.mockResolvedValue(null);

            await expect(
                createTask("host-1", { ...baseTaskData, parent_task_id: PARENT_ID })
            ).rejects.toThrow(/parent_task_id/);

            expect(mockSaveTaskToDb).not.toHaveBeenCalled();
        });

        it("stores parent_task_id when the parent exists for this host", async () => {
            mockGetTaskById.mockResolvedValue({ id: PARENT_ID, host_id: "host-1" });

            await createTask("host-1", { ...baseTaskData, parent_task_id: PARENT_ID });

            expect(mockSaveTaskToDb).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ parent_task_id: PARENT_ID })
            );
        });
    });

    describe("updateTask", () => {
        beforeEach(() => {
            mockGetTaskById.mockImplementation(async (dataSource, taskId) => {
                if (taskId === "task-1") return { id: "task-1", host_id: "host-1", status: "Pending", due_date: null };
                return null;
            });
        });

        it("rejects a parent_task_id equal to the task's own id", async () => {
            const selfId = "11111111-1111-4111-8111-111111111111";
            mockGetTaskById.mockImplementation(async (dataSource, taskId) => {
                if (taskId === selfId) return { id: selfId, host_id: "host-1", status: "Pending", due_date: null };
                return null;
            });

            await expect(
                updateTask("host-1", selfId, { parent_task_id: selfId })
            ).rejects.toThrow(/parent_task_id cannot reference itself/);

            expect(mockUpdateTaskInDb).not.toHaveBeenCalled();
        });

        it("rejects a malformed parent_task_id without querying the database further", async () => {
            await expect(
                updateTask("host-1", "task-1", { parent_task_id: "not-a-uuid" })
            ).rejects.toThrow(/parent_task_id must be a valid UUID/);

            expect(mockUpdateTaskInDb).not.toHaveBeenCalled();
        });

        it("rejects a parent_task_id that does not belong to this host", async () => {
            await expect(
                updateTask("host-1", "task-1", { parent_task_id: PARENT_ID })
            ).rejects.toThrow(/parent_task_id does not belong to this host/);

            expect(mockUpdateTaskInDb).not.toHaveBeenCalled();
        });

        it("accepts a parent_task_id that belongs to this host", async () => {
            mockGetTaskById.mockImplementation(async (dataSource, taskId) => {
                if (taskId === "task-1") return { id: "task-1", host_id: "host-1", status: "Pending", due_date: null };
                if (taskId === PARENT_ID) return { id: PARENT_ID, host_id: "host-1" };
                return null;
            });

            await updateTask("host-1", "task-1", { parent_task_id: PARENT_ID });

            expect(mockUpdateTaskInDb).toHaveBeenCalledWith(
                expect.anything(),
                "task-1",
                expect.objectContaining({ parent_task_id: PARENT_ID })
            );
        });

        it("clears parent_task_id when set to null", async () => {
            await updateTask("host-1", "task-1", { parent_task_id: null });

            expect(mockUpdateTaskInDb).toHaveBeenCalledWith(
                expect.anything(),
                "task-1",
                expect.objectContaining({ parent_task_id: null })
            );
        });
    });
});
