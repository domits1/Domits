jest.mock("database", () => ({
    __esModule: true,
    default: { getInstance: jest.fn(async () => ({})) },
}));

const mockS3Send = jest.fn();
const mockDeleteObjectsCommand = jest.fn();

jest.mock("@aws-sdk/client-s3", () => ({
    S3Client: jest.fn().mockImplementation(() => ({ send: (...args) => mockS3Send(...args) })),
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
    DeleteObjectsCommand: jest.fn().mockImplementation(function (input) {
        mockDeleteObjectsCommand(input);
        return input;
    }),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
    getSignedUrl: jest.fn(),
}));

const mockGetTaskById = jest.fn();
const mockUpdateTaskInDb = jest.fn();
const mockSaveActivityToDb = jest.fn();

jest.mock("../../functions/property-tasks/data/taskRepository.js", () => ({
    getTaskById: (...args) => mockGetTaskById(...args),
    updateTaskInDb: (...args) => mockUpdateTaskInDb(...args),
    saveActivityToDb: (...args) => mockSaveActivityToDb(...args),
}));

const { updateTask } = require("../../functions/property-tasks/business/service/taskService.js");

describe("updateTask attachment removal", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUpdateTaskInDb.mockResolvedValue();
        mockSaveActivityToDb.mockResolvedValue();
        mockS3Send.mockResolvedValue({});
    });

    it("deletes from S3 only the attachments removed from the task", async () => {
        mockGetTaskById.mockResolvedValue({
            id: "task-1",
            host_id: "host-1",
            status: "Pending",
            attachments: JSON.stringify(["tasks/host-1/a.png", "tasks/host-1/b.png"]),
        });

        await updateTask("host-1", "task-1", { attachments: ["tasks/host-1/b.png"] });

        expect(mockDeleteObjectsCommand).toHaveBeenCalledWith({
            Bucket: "domits-task-attachments",
            Delete: { Objects: [{ Key: "tasks/host-1/a.png" }] },
        });
        expect(mockS3Send).toHaveBeenCalledTimes(1);
        expect(mockUpdateTaskInDb).toHaveBeenCalledWith(
            {},
            "task-1",
            expect.objectContaining({ attachments: JSON.stringify(["tasks/host-1/b.png"]) })
        );
    });

    it("does not call S3 when no attachments were removed", async () => {
        mockGetTaskById.mockResolvedValue({
            id: "task-1",
            host_id: "host-1",
            status: "Pending",
            attachments: JSON.stringify(["tasks/host-1/a.png"]),
        });

        await updateTask("host-1", "task-1", { attachments: ["tasks/host-1/a.png", "tasks/host-1/b.png"] });

        expect(mockS3Send).not.toHaveBeenCalled();
    });

    it("deletes all old attachments and stores null when the task is cleared", async () => {
        mockGetTaskById.mockResolvedValue({
            id: "task-1",
            host_id: "host-1",
            status: "Pending",
            attachments: JSON.stringify(["tasks/host-1/a.png"]),
        });

        await updateTask("host-1", "task-1", { attachments: [] });

        expect(mockDeleteObjectsCommand).toHaveBeenCalledWith({
            Bucket: "domits-task-attachments",
            Delete: { Objects: [{ Key: "tasks/host-1/a.png" }] },
        });
        expect(mockUpdateTaskInDb).toHaveBeenCalledWith(
            {},
            "task-1",
            expect.objectContaining({ attachments: null })
        );
    });
});
