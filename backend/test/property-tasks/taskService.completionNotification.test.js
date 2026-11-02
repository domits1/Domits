jest.mock("database", () => require("./taskRepositoryTestDoubles.js").databaseMock);
jest.mock("../../functions/property-tasks/data/taskRepository.js", () => require("./taskRepositoryTestDoubles.js").taskRepositoryMock);

const mockNotifyTaskCompleted = jest.fn();

jest.mock("../../functions/property-tasks/business/service/taskNotificationService.js", () => ({
    notifyTaskAssigned: jest.fn(),
    notifyTaskCompleted: (...args) => mockNotifyTaskCompleted(...args),
}));

const {
    mockGetTaskById,
    mockUpdateTaskInDb,
    mockUpdateTaskUnlessCompleted,
    mockSaveActivityToDb,
    mockGetChecklistItemsForTask,
    resetTaskRepositoryMocks,
} = require("./taskRepositoryTestDoubles.js");

const { updateTask } = require("../../functions/property-tasks/business/service/taskService.js");

const TEAM_MEMBER = { actorIsTeamMember: true };

describe("updateTask completion notification", () => {
    beforeEach(() => {
        resetTaskRepositoryMocks();
        mockGetTaskById.mockResolvedValue({
            id: "task-1",
            host_id: "host-1",
            title: "Clean the villa",
            status: "In progress",
            due_date: null,
        });
    });

    it("notifies the host when a team member completes the task, with the task as it is after the update", async () => {
        await updateTask("host-1", "task-1", { status: "Completed" }, TEAM_MEMBER);

        expect(mockNotifyTaskCompleted).toHaveBeenCalledTimes(1);
        expect(mockNotifyTaskCompleted).toHaveBeenCalledWith(
            "host-1",
            expect.objectContaining({ id: "task-1", status: "Completed", completed_date: expect.any(Number) })
        );
    });

    it("does not notify the host about a task they completed themselves", async () => {
        await updateTask("host-1", "task-1", { status: "Completed" });

        expect(mockNotifyTaskCompleted).not.toHaveBeenCalled();
    });

    it("does not notify again when the task was already completed", async () => {
        mockGetTaskById.mockResolvedValue({ id: "task-1", host_id: "host-1", status: "Completed", due_date: null });

        await updateTask("host-1", "task-1", { status: "Completed" }, TEAM_MEMBER);

        expect(mockNotifyTaskCompleted).not.toHaveBeenCalled();
    });

    it("does not notify for other status changes", async () => {
        await updateTask("host-1", "task-1", { status: "In progress" }, TEAM_MEMBER);
        await updateTask("host-1", "task-1", { status: "Cancelled" }, TEAM_MEMBER);

        expect(mockNotifyTaskCompleted).not.toHaveBeenCalled();
    });

    it("does not notify when required checklist items block the completion", async () => {
        mockGetChecklistItemsForTask.mockResolvedValue([{ is_required: true, is_checked: false }]);

        await expect(
            updateTask("host-1", "task-1", { status: "Completed" }, TEAM_MEMBER)
        ).rejects.toThrow(/required checklist items/);

        expect(mockNotifyTaskCompleted).not.toHaveBeenCalled();
    });

    it("does not notify when the update could not be saved", async () => {
        mockUpdateTaskUnlessCompleted.mockRejectedValue(new Error("database down"));

        await expect(
            updateTask("host-1", "task-1", { status: "Completed" }, TEAM_MEMBER)
        ).rejects.toThrow("database down");

        expect(mockNotifyTaskCompleted).not.toHaveBeenCalled();
    });

    describe("when two people complete the same task at the same moment", () => {
        it("completes the task with a write that only applies while it is not completed yet", async () => {
            await updateTask("host-1", "task-1", { status: "Completed" }, TEAM_MEMBER);

            expect(mockUpdateTaskUnlessCompleted).toHaveBeenCalledWith(
                expect.anything(),
                "task-1",
                expect.objectContaining({ status: "Completed", completed_date: expect.any(Number) })
            );
            expect(mockUpdateTaskInDb).not.toHaveBeenCalled();
        });

        it("sends no email, writes no activity and still answers normally for the one that lost", async () => {
            mockUpdateTaskUnlessCompleted.mockResolvedValue(false);

            await expect(
                updateTask("host-1", "task-1", { status: "Completed" }, TEAM_MEMBER)
            ).resolves.toEqual({ message: "Task updated successfully" });

            expect(mockNotifyTaskCompleted).not.toHaveBeenCalled();
            expect(mockSaveActivityToDb).not.toHaveBeenCalled();
        });

        it("uses the plain write for updates that do not complete the task", async () => {
            await updateTask("host-1", "task-1", { priority: "High" }, TEAM_MEMBER);

            expect(mockUpdateTaskInDb).toHaveBeenCalledTimes(1);
            expect(mockUpdateTaskUnlessCompleted).not.toHaveBeenCalled();
        });
    });
});
