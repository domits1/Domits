jest.mock("database", () => require("./taskRepositoryTestDoubles.js").databaseMock);
jest.mock("../../functions/property-tasks/data/taskRepository.js", () => require("./taskRepositoryTestDoubles.js").taskRepositoryMock);

const mockS3Send = jest.fn();

jest.mock("@aws-sdk/client-s3", () => ({
    S3Client: jest.fn().mockImplementation(() => ({ send: (...args) => mockS3Send(...args) })),
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
    DeleteObjectsCommand: jest.fn().mockImplementation(function (input) {
        return { input };
    }),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: jest.fn() }));

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
const { updateTask, deleteTask } = require("../../functions/property-tasks/business/service/taskService.js");

const KEPT = "tasks/host-1/0b6c1d2e-3f40-4a5b-9c6d-7e8f9a0b1c2d.jpg";
const REMOVED = "tasks/host-1/2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f60.pdf";

const taskHolding = (status = "Pending") => ({
    id: "task-1",
    host_id: "host-1",
    status,
    due_date: null,
    attachments: JSON.stringify([KEPT, REMOVED]),
});

describe("removing attachment files", () => {
    let consoleError;

    beforeEach(() => {
        resetTaskRepositoryMocks();
        mockS3Send.mockReset();
        mockS3Send.mockResolvedValue({});
        consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        consoleError.mockRestore();
    });

    it("removes a file taken off the task only after the task is saved", async () => {
        mockGetTaskById.mockResolvedValue(taskHolding());

        await updateTask("host-1", "task-1", { attachments: [KEPT] });

        expect(mockS3Send).toHaveBeenCalledTimes(1);
        expect(mockS3Send.mock.calls[0][0].input.Delete.Objects).toEqual([{ Key: REMOVED }]);
        expect(mockUpdateTaskInDb.mock.invocationCallOrder[0]).toBeLessThan(mockS3Send.mock.invocationCallOrder[0]);
    });

    it("keeps the files when the save fails", async () => {
        mockGetTaskById.mockResolvedValue(taskHolding());
        mockUpdateTaskInDb.mockRejectedValue(new Error("database unavailable"));

        await expect(updateTask("host-1", "task-1", { attachments: [KEPT] })).rejects.toThrow("database unavailable");

        expect(mockS3Send).not.toHaveBeenCalled();
    });

    it("keeps the files when completing is refused for unchecked required items", async () => {
        mockGetTaskById.mockResolvedValue(taskHolding());
        mockGetChecklistItemsForTask.mockResolvedValue([{ is_required: true, is_checked: false }]);

        await expect(updateTask("host-1", "task-1", { status: "Completed", attachments: [KEPT] })).rejects.toMatchObject({ statusCode: 400 });

        expect(mockS3Send).not.toHaveBeenCalled();
        expect(mockUpdateTaskUnlessCompleted).not.toHaveBeenCalled();
    });

    it("keeps the files when another request completed the task first and this write did not apply", async () => {
        mockGetTaskById.mockResolvedValue(taskHolding());
        mockUpdateTaskUnlessCompleted.mockResolvedValue(false);

        await updateTask("host-1", "task-1", { status: "Completed", attachments: [KEPT] });

        expect(mockS3Send).not.toHaveBeenCalled();
    });

    it("removes the files once the completion applied", async () => {
        mockGetTaskById.mockResolvedValue(taskHolding());

        await updateTask("host-1", "task-1", { status: "Completed", attachments: [KEPT] });

        expect(mockS3Send).toHaveBeenCalledTimes(1);
        expect(mockUpdateTaskUnlessCompleted.mock.invocationCallOrder[0]).toBeLessThan(mockS3Send.mock.invocationCallOrder[0]);
    });

    it("still answers the saved update, logs it and notifies, when removing the file fails", async () => {
        mockGetTaskById.mockResolvedValue(taskHolding());
        mockS3Send.mockRejectedValue(new Error("storage unavailable"));

        const result = await updateTask("host-1", "task-1", { status: "Completed", attachments: [KEPT] }, { actorIsTeamMember: true });

        expect(result).toEqual({ message: "Task updated successfully" });
        expect(mockSaveActivityToDb).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action_type: "TASK_UPDATED" }));
        expect(mockNotifyTaskCompleted).toHaveBeenCalled();
        expect(consoleError).toHaveBeenCalledWith("Failed to remove the attachments of task task-1", expect.any(Error));
    });

    it("logs the files storage could not remove", async () => {
        mockGetTaskById.mockResolvedValue(taskHolding());
        const errors = [{ Key: REMOVED, Code: "AccessDenied" }];
        mockS3Send.mockResolvedValue({ Errors: errors });

        await updateTask("host-1", "task-1", { attachments: [KEPT] });

        expect(consoleError).toHaveBeenCalledWith("Failed to remove 1 attachment(s) of task task-1", errors);
    });

    it("logs nothing when storage removed every file", async () => {
        mockGetTaskById.mockResolvedValue(taskHolding());
        mockS3Send.mockResolvedValue({ Deleted: [{ Key: REMOVED }], Errors: [] });

        await updateTask("host-1", "task-1", { attachments: [KEPT] });

        expect(consoleError).not.toHaveBeenCalled();
    });

    it("still deletes the task, and logs it, when removing its files fails", async () => {
        mockGetTaskById.mockResolvedValue(taskHolding());
        mockS3Send.mockRejectedValue(new Error("storage unavailable"));

        await deleteTask("host-1", "task-1");

        expect(mockUpdateTaskInDb).toHaveBeenCalledWith(expect.anything(), "task-1", expect.objectContaining({ is_legacy: true }));
        expect(consoleError).toHaveBeenCalledWith("Failed to remove the attachments of task task-1", expect.any(Error));
    });
});
