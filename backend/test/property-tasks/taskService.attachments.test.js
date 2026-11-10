jest.mock("database", () => require("./taskRepositoryTestDoubles.js").databaseMock);
jest.mock("../../functions/property-tasks/data/taskRepository.js", () => require("./taskRepositoryTestDoubles.js").taskRepositoryMock);

const mockS3Send = jest.fn();
const mockGetSignedUrl = jest.fn();
const mockCommandOf = (type) => jest.fn().mockImplementation(function (input) {
    return { type, input };
});

jest.mock("@aws-sdk/client-s3", () => ({
    S3Client: jest.fn().mockImplementation(() => ({ send: (...args) => mockS3Send(...args) })),
    PutObjectCommand: mockCommandOf("put"),
    GetObjectCommand: mockCommandOf("get"),
    DeleteObjectsCommand: mockCommandOf("delete"),
}));
jest.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: (...args) => mockGetSignedUrl(...args) }));

const mockNotifyTaskCompleted = jest.fn();
jest.mock("../../functions/property-tasks/business/service/taskNotificationService.js", () => ({
    notifyTaskAssigned: jest.fn(),
    notifyTaskCompleted: (...args) => mockNotifyTaskCompleted(...args),
}));

const doubles = require("./taskRepositoryTestDoubles.js");
const service = require("../../functions/property-tasks/business/service/taskService.js");

const TASK_ID = "6f1c2a7e-3b4d-4c5e-8f90-1a2b3c4d5e6f";
const OWN_A = "tasks/host-1/0b6c1d2e-3f40-4a5b-9c6d-7e8f9a0b1c2d.jpg";
const OWN_B = "tasks/host-1/2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f60.pdf";
const FOREIGN = "tasks/host-2/1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f.jpg";
const NEW_TASK = { title: "Clean", property_id: "prop-1", property_snapshot_label: "Villa", type: "Cleaning" };

const taskHolding = (keys, status = "Pending") => ({ id: "task-1", host_id: "host-1", status, due_date: null, attachments: JSON.stringify(keys) });
const removedFromStorage = () => mockS3Send.mock.calls.flatMap(([command]) => command.input.Delete.Objects.map(({ Key }) => Key));

let consoleError;

beforeEach(() => {
    doubles.resetTaskRepositoryMocks();
    mockS3Send.mockReset();
    mockS3Send.mockResolvedValue({ Errors: [] });
    mockGetSignedUrl.mockResolvedValue("https://signed.example/link");
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => consoleError.mockRestore());

describe("getViewUrl", () => {
    it("signs the key stored on the task, found under the caller's host", async () => {
        doubles.mockGetTaskById.mockResolvedValue(taskHolding([OWN_A]));

        await expect(service.getViewUrl("host-1", TASK_ID, OWN_A)).resolves.toBe("https://signed.example/link");

        expect(doubles.mockGetTaskById).toHaveBeenCalledWith(expect.anything(), TASK_ID, "host-1");
        const [, command, options] = mockGetSignedUrl.mock.calls[0];
        expect(command).toEqual({ type: "get", input: { Bucket: "domits-task-attachments", Key: OWN_A } });
        expect(options).toEqual({ expiresIn: 3600 });
    });

    it.each([
        ["a key that is not on the task", taskHolding([OWN_A]), OWN_B],
        ["a task that is not the caller's host's", null, OWN_A],
        ["a key on the task outside the host's folder", taskHolding([FOREIGN]), FOREIGN],
    ])("answers 404 and signs nothing for %s", async (_label, task, key) => {
        doubles.mockGetTaskById.mockResolvedValue(task);

        await expect(service.getViewUrl("host-1", TASK_ID, key)).rejects.toMatchObject({ statusCode: 404, message: "Attachment not found" });
        expect(mockGetSignedUrl).not.toHaveBeenCalled();
    });

    it.each([
        [undefined, OWN_A],
        ["task-1", OWN_A],
        [TASK_ID, ""],
        [TASK_ID, [OWN_A]],
    ])("answers 400 for task id %p and key %p before looking anything up", async (taskId, key) => {
        await expect(service.getViewUrl("host-1", taskId, key)).rejects.toMatchObject({ statusCode: 400 });
        expect(doubles.mockGetTaskById).not.toHaveBeenCalled();
    });
});

describe("getUploadUrl", () => {
    it("signs an upload of the declared type and size to a new key in the host's folder", async () => {
        const { uploadUrl, key } = await service.getUploadUrl("host-1", "image/png", "2048");

        expect(uploadUrl).toBe("https://signed.example/link");
        expect(key).toMatch(/^tasks\/host-1\/[0-9a-f-]{36}\.png$/);
        const [, command, options] = mockGetSignedUrl.mock.calls[0];
        expect(command.input).toEqual({ Bucket: "domits-task-attachments", Key: key, ContentType: "image/png", ContentLength: 2048 });
        expect(options.expiresIn).toBe(300);
        expect([...options.signableHeaders].sort()).toEqual(["content-length", "content-type"]);
    });

    it("signs nothing for a refused file", async () => {
        await expect(service.getUploadUrl("host-1", "text/html", "2048")).rejects.toMatchObject({ statusCode: 400 });
        expect(mockGetSignedUrl).not.toHaveBeenCalled();
    });
});

describe("attachments a task may hold", () => {
    it("creates a task with files of the host's folder", async () => {
        await service.createTask("host-1", { ...NEW_TASK, attachments: [OWN_A, OWN_B] });

        expect(doubles.mockSaveTaskToDb).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ attachments: JSON.stringify([OWN_A, OWN_B]) }));
    });

    it.each([[[OWN_A, FOREIGN]], [OWN_A]])("creates nothing for attachments %p", async (attachments) => {
        await expect(service.createTask("host-1", { ...NEW_TASK, attachments })).rejects.toMatchObject({ statusCode: 400 });
        expect(doubles.mockSaveTaskToDb).not.toHaveBeenCalled();
    });

    it.each([[[OWN_A, FOREIGN]], ["none"]])("updates and removes nothing for attachments %p", async (attachments) => {
        doubles.mockGetTaskById.mockResolvedValue(taskHolding([OWN_A]));

        await expect(service.updateTask("host-1", "task-1", { attachments })).rejects.toMatchObject({ statusCode: 400 });
        expect(mockS3Send).not.toHaveBeenCalled();
        expect(doubles.mockUpdateTaskInDb).not.toHaveBeenCalled();
    });

    it("keeps a file from another folder that the task already holds", async () => {
        doubles.mockGetTaskById.mockResolvedValue(taskHolding([OWN_A, FOREIGN]));

        await service.updateTask("host-1", "task-1", { attachments: [FOREIGN, OWN_B] });

        expect(doubles.mockUpdateTaskInDb).toHaveBeenCalledWith(expect.anything(), "task-1", expect.objectContaining({ attachments: JSON.stringify([FOREIGN, OWN_B]) }));
        expect(removedFromStorage()).toEqual([OWN_A]);
    });

    it.each([[[]], [null]])("clears the attachments for %p, removing only the host's files from storage", async (attachments) => {
        doubles.mockGetTaskById.mockResolvedValue(taskHolding([OWN_A, FOREIGN]));

        await service.updateTask("host-1", "task-1", { attachments });

        expect(doubles.mockUpdateTaskInDb).toHaveBeenCalledWith(expect.anything(), "task-1", expect.objectContaining({ attachments: null }));
        expect(removedFromStorage()).toEqual([OWN_A]);
    });

    it("removes only the files in the host's folder when the task is deleted", async () => {
        doubles.mockGetTaskById.mockResolvedValue(taskHolding([OWN_A, FOREIGN, "tasks/host-1/sub/x.jpg"]));

        await service.deleteTask("host-1", "task-1");

        expect(removedFromStorage()).toEqual([OWN_A]);
        expect(doubles.mockUpdateTaskInDb).toHaveBeenCalledWith(expect.anything(), "task-1", expect.objectContaining({ is_legacy: true }));
    });
});

describe("removing files taken off a task", () => {
    it("happens only after the task is saved", async () => {
        doubles.mockGetTaskById.mockResolvedValue(taskHolding([OWN_A, OWN_B]));

        await service.updateTask("host-1", "task-1", { attachments: [OWN_A] });

        expect(removedFromStorage()).toEqual([OWN_B]);
        expect(doubles.mockUpdateTaskInDb.mock.invocationCallOrder[0]).toBeLessThan(mockS3Send.mock.invocationCallOrder[0]);
        expect(consoleError).not.toHaveBeenCalled();
    });

    it.each([
        ["the save fails", () => doubles.mockUpdateTaskInDb.mockRejectedValue(new Error("database unavailable")), {}, "database unavailable"],
        [
            "completing is refused for unchecked required items",
            () => doubles.mockGetChecklistItemsForTask.mockResolvedValue([{ is_required: true, is_checked: false }]),
            { status: "Completed" },
            "Cannot complete task: required checklist items are not all checked",
        ],
        ["another request completed the task first", () => doubles.mockUpdateTaskUnlessCompleted.mockResolvedValue(false), { status: "Completed" }, null],
    ])("does not happen when %s", async (_label, arrange, change, expectedError) => {
        doubles.mockGetTaskById.mockResolvedValue(taskHolding([OWN_A, OWN_B]));
        arrange();

        const error = await service.updateTask("host-1", "task-1", { ...change, attachments: [OWN_A] }).then(() => null, (thrown) => thrown.message);

        expect(error).toBe(expectedError);
        expect(mockS3Send).not.toHaveBeenCalled();
    });

    it("does not fail a saved update when it fails, and is logged", async () => {
        doubles.mockGetTaskById.mockResolvedValue(taskHolding([OWN_A, OWN_B]));
        mockS3Send.mockRejectedValue(new Error("storage unavailable"));

        const result = await service.updateTask("host-1", "task-1", { status: "Completed", attachments: [OWN_A] }, { actorIsTeamMember: true });

        expect(result).toEqual({ message: "Task updated successfully" });
        expect(doubles.mockSaveActivityToDb).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action_type: "TASK_UPDATED" }));
        expect(mockNotifyTaskCompleted).toHaveBeenCalled();
        expect(consoleError).toHaveBeenCalledWith("Failed to remove the attachments of task task-1", expect.any(Error));
    });

    it("logs the files storage could not remove", async () => {
        doubles.mockGetTaskById.mockResolvedValue(taskHolding([OWN_A, OWN_B]));
        const errors = [{ Key: OWN_B, Code: "AccessDenied" }];
        mockS3Send.mockResolvedValue({ Errors: errors });

        await service.updateTask("host-1", "task-1", { attachments: [OWN_A] });

        expect(consoleError).toHaveBeenCalledWith("Failed to remove 1 attachment(s) of task task-1", errors);
    });

    it("does not stop a delete when it fails, and is logged", async () => {
        doubles.mockGetTaskById.mockResolvedValue(taskHolding([OWN_A]));
        mockS3Send.mockRejectedValue(new Error("storage unavailable"));

        await service.deleteTask("host-1", "task-1");

        expect(doubles.mockUpdateTaskInDb).toHaveBeenCalledWith(expect.anything(), "task-1", expect.objectContaining({ is_legacy: true }));
        expect(consoleError).toHaveBeenCalledWith("Failed to remove the attachments of task task-1", expect.any(Error));
    });
});
