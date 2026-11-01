jest.mock("database", () => require("./taskRepositoryTestDoubles.js").databaseMock);
jest.mock("../../functions/property-tasks/data/taskRepository.js", () => require("./taskRepositoryTestDoubles.js").taskRepositoryMock);

const mockGetSignedUrl = jest.fn();
const mockGetObjectCommand = jest.fn();

jest.mock("@aws-sdk/client-s3", () => ({
    S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn().mockImplementation(function (input) {
        mockGetObjectCommand(input);
        return { input };
    }),
    DeleteObjectsCommand: jest.fn(),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
    getSignedUrl: (...args) => mockGetSignedUrl(...args),
}));

const { mockGetTaskById, resetTaskRepositoryMocks } = require("./taskRepositoryTestDoubles.js");
const { getViewUrl } = require("../../functions/property-tasks/business/service/taskService.js");

const TASK_ID = "6f1c2a7e-3b4d-4c5e-8f90-1a2b3c4d5e6f";
const OWN_KEY = "tasks/host-1/0b6c1d2e-3f40-4a5b-9c6d-7e8f9a0b1c2d.jpg";
const OTHER_HOST_KEY = "tasks/host-2/1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f.jpg";

const taskWith = (keys) => ({ id: TASK_ID, host_id: "host-1", attachments: JSON.stringify(keys) });

describe("getViewUrl", () => {
    beforeEach(() => {
        resetTaskRepositoryMocks();
        mockGetSignedUrl.mockResolvedValue("https://signed.example/view");
    });

    it("signs the key stored on the caller's task, looked up under the caller's host", async () => {
        mockGetTaskById.mockResolvedValue(taskWith([OWN_KEY]));

        const viewUrl = await getViewUrl("host-1", TASK_ID, OWN_KEY);

        expect(viewUrl).toBe("https://signed.example/view");
        expect(mockGetTaskById).toHaveBeenCalledWith(expect.anything(), TASK_ID, "host-1");
        expect(mockGetObjectCommand).toHaveBeenCalledWith({ Bucket: "domits-task-attachments", Key: OWN_KEY });
        expect(mockGetSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), { expiresIn: 3600 });
    });

    it("refuses a key that is not on the task, even one in the caller's own folder", async () => {
        mockGetTaskById.mockResolvedValue(taskWith([OWN_KEY]));
        const otherOwnKey = "tasks/host-1/2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f60.pdf";

        await expect(getViewUrl("host-1", TASK_ID, otherOwnKey)).rejects.toMatchObject({ statusCode: 404 });
        expect(mockGetSignedUrl).not.toHaveBeenCalled();
    });

    it("refuses when the task is not one of the caller's host", async () => {
        mockGetTaskById.mockResolvedValue(null);

        await expect(getViewUrl("host-1", TASK_ID, OTHER_HOST_KEY)).rejects.toMatchObject({
            statusCode: 404,
            message: "Attachment not found",
        });
        expect(mockGetSignedUrl).not.toHaveBeenCalled();
    });

    it("refuses a key stored on the task that lies outside the host's own folder", async () => {
        mockGetTaskById.mockResolvedValue(taskWith([OTHER_HOST_KEY]));

        await expect(getViewUrl("host-1", TASK_ID, OTHER_HOST_KEY)).rejects.toMatchObject({ statusCode: 404 });
        expect(mockGetSignedUrl).not.toHaveBeenCalled();
    });

    it.each([undefined, "", "task-1", 42])("refuses task id %p before looking anything up", async (taskId) => {
        await expect(getViewUrl("host-1", taskId, OWN_KEY)).rejects.toMatchObject({ statusCode: 400 });
        expect(mockGetTaskById).not.toHaveBeenCalled();
        expect(mockGetSignedUrl).not.toHaveBeenCalled();
    });

    it.each([undefined, "", ["tasks/host-1/x.jpg"]])("refuses key %p before looking anything up", async (key) => {
        await expect(getViewUrl("host-1", TASK_ID, key)).rejects.toMatchObject({ statusCode: 400, message: "key is required" });
        expect(mockGetTaskById).not.toHaveBeenCalled();
    });

    it("refuses when the stored attachments cannot be read", async () => {
        mockGetTaskById.mockResolvedValue({ id: TASK_ID, host_id: "host-1", attachments: "not json" });

        await expect(getViewUrl("host-1", TASK_ID, OWN_KEY)).rejects.toMatchObject({ statusCode: 404 });
        expect(mockGetSignedUrl).not.toHaveBeenCalled();
    });
});
