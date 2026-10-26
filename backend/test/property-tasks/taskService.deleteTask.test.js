jest.mock("database", () => require("./taskRepositoryTestDoubles.js").databaseMock);
jest.mock("../../functions/property-tasks/data/taskRepository.js", () => require("./taskRepositoryTestDoubles.js").taskRepositoryMock);

const mockS3Send = jest.fn();

jest.mock("@aws-sdk/client-s3", () => ({
    S3Client: jest.fn(() => ({ send: (...args) => mockS3Send(...args) })),
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
    DeleteObjectsCommand: jest.fn(),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: jest.fn() }));

const {
    mockGetTaskById,
    mockUpdateTaskInDb,
    resetTaskRepositoryMocks,
} = require("./taskRepositoryTestDoubles.js");

const { deleteTask } = require("../../functions/property-tasks/business/service/taskService.js");

const taskWith = (status, extra = {}) => ({ id: "task-1", host_id: "host-1", status, due_date: null, ...extra });

describe("deleteTask", () => {
    beforeEach(() => {
        resetTaskRepositoryMocks();
        mockS3Send.mockReset();
        mockS3Send.mockResolvedValue({});
    });

    it("refuses to delete a completed task, and tells the user to change its status first", async () => {
        mockGetTaskById.mockResolvedValue(taskWith("Completed"));

        await expect(deleteTask("host-1", "task-1")).rejects.toThrow(/completed task cannot be deleted.*change its status/i);

        expect(mockUpdateTaskInDb).not.toHaveBeenCalled();
    });

    it("keeps the attachment files of a completed task when it refuses to delete it", async () => {
        mockGetTaskById.mockResolvedValue(taskWith("Completed", { attachments: JSON.stringify(["tasks/host-1/photo.png"]) }));

        await expect(deleteTask("host-1", "task-1")).rejects.toThrow(/completed task cannot be deleted/i);

        expect(mockS3Send).not.toHaveBeenCalled();
    });

    it.each(["Pending", "In progress", "Cancelled"])("moves a %s task to the legacy list", async (status) => {
        mockGetTaskById.mockResolvedValue(taskWith(status));

        await deleteTask("host-1", "task-1");

        expect(mockUpdateTaskInDb).toHaveBeenCalledWith(
            expect.anything(),
            "task-1",
            expect.objectContaining({ is_legacy: true })
        );
    });

    it("still removes the attachment files of a task that can be deleted", async () => {
        mockGetTaskById.mockResolvedValue(taskWith("Pending", { attachments: JSON.stringify(["tasks/host-1/photo.png"]) }));

        await deleteTask("host-1", "task-1");

        expect(mockS3Send).toHaveBeenCalledTimes(1);
    });
});
