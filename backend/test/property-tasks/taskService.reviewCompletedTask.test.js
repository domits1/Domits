jest.mock("database", () => require("./taskRepositoryTestDoubles.js").databaseMock);
jest.mock("../../functions/property-tasks/data/taskRepository.js", () => require("./taskRepositoryTestDoubles.js").taskRepositoryMock);

const mockNotifyTaskApproved = jest.fn();
const mockNotifyTaskRejected = jest.fn();

jest.mock("../../functions/property-tasks/business/service/taskReviewNotificationService.js", () => ({
    notifyTaskApproved: (...args) => mockNotifyTaskApproved(...args),
    notifyTaskRejected: (...args) => mockNotifyTaskRejected(...args),
}));

const {
    mockGetTaskById,
    mockSaveActivityToDb,
    mockApproveCompletedTaskInDb,
    mockRejectCompletedTaskInDb,
    resetTaskRepositoryMocks,
} = require("./taskRepositoryTestDoubles.js");

const { approveTask, rejectTask } = require("../../functions/property-tasks/business/service/taskService.js");

const completedTask = { id: "task-1", host_id: "host-1", status: "Completed", approved_at: null, title: "Fix AC" };

describe.each([
    {
        name: "approveTask",
        review: approveTask,
        claim: () => mockApproveCompletedTaskInDb,
        notify: () => mockNotifyTaskApproved,
        actionType: "TASK_APPROVED",
        notCompletedMessage: /Only a completed task can be approved/,
        message: "Task approved",
    },
    {
        name: "rejectTask",
        review: rejectTask,
        claim: () => mockRejectCompletedTaskInDb,
        notify: () => mockNotifyTaskRejected,
        actionType: "TASK_REJECTED",
        notCompletedMessage: /Only a completed task can be rejected/,
        message: "Task rejected and reopened",
    },
])("$name", ({ review, claim, notify, actionType, notCompletedMessage, message }) => {
    beforeEach(() => {
        resetTaskRepositoryMocks();
        mockNotifyTaskApproved.mockResolvedValue();
        mockNotifyTaskRejected.mockResolvedValue();
        mockGetTaskById.mockResolvedValue(completedTask);
    });

    it("rejects when the task id is missing", async () => {
        await expect(review("host-1", undefined, "user-1")).rejects.toThrow(/id is required/);
        expect(mockGetTaskById).not.toHaveBeenCalled();
    });

    it("rejects when the task does not belong to this host", async () => {
        mockGetTaskById.mockResolvedValue(null);

        await expect(review("host-1", "task-1", "user-1")).rejects.toThrow(/Task not found/);
        expect(claim()).not.toHaveBeenCalled();
    });

    it.each(["Pending", "In progress", "Cancelled"])("rejects a task that is %s, since only a completed one can be reviewed", async (status) => {
        mockGetTaskById.mockResolvedValue({ ...completedTask, status });

        await expect(review("host-1", "task-1", "user-1")).rejects.toThrow(notCompletedMessage);

        expect(claim()).not.toHaveBeenCalled();
        expect(notify()).not.toHaveBeenCalled();
    });

    it("rejects a task that was already approved", async () => {
        mockGetTaskById.mockResolvedValue({ ...completedTask, approved_at: Date.now() });

        await expect(review("host-1", "task-1", "user-1")).rejects.toThrow(/already been approved|approved task cannot be rejected/);

        expect(claim()).not.toHaveBeenCalled();
        expect(notify()).not.toHaveBeenCalled();
    });

    it("claims the task, records who did it, and emails the assignee", async () => {
        await expect(review("host-1", "task-1", "manager-1")).resolves.toEqual({ message });

        expect(claim()).toHaveBeenCalledWith(expect.anything(), "task-1", "host-1", expect.any(Number));
        expect(mockSaveActivityToDb).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ task_id: "task-1", user_id: "manager-1", action_type: actionType })
        );
        expect(notify()).toHaveBeenCalledWith(completedTask);
    });

    it("does nothing more when another request got there first", async () => {
        claim().mockResolvedValue(false);

        await expect(review("host-1", "task-1", "user-1")).rejects.toThrow(/no longer waiting for a decision/);

        expect(mockSaveActivityToDb).not.toHaveBeenCalled();
        expect(notify()).not.toHaveBeenCalled();
    });
});
