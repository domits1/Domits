const mockGetSignedUrl = jest.fn();
const mockPutObjectCommand = jest.fn();

jest.mock("@aws-sdk/client-s3", () => ({
    S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
    PutObjectCommand: jest.fn().mockImplementation(function (input) {
        mockPutObjectCommand(input);
        return { input };
    }),
    GetObjectCommand: jest.fn(),
    DeleteObjectsCommand: jest.fn(),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
    getSignedUrl: (...args) => mockGetSignedUrl(...args),
}));

jest.mock("database", () => require("./taskRepositoryTestDoubles.js").databaseMock);
jest.mock("../../functions/property-tasks/data/taskRepository.js", () => require("./taskRepositoryTestDoubles.js").taskRepositoryMock);

const { getUploadUrl } = require("../../functions/property-tasks/business/service/taskService.js");

describe("getUploadUrl", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetSignedUrl.mockResolvedValue("https://signed.example/upload");
    });

    it("signs an upload of the declared type and size to a new key in the host's folder", async () => {
        const result = await getUploadUrl("host-1", "image/png", "2048");

        expect(result.uploadUrl).toBe("https://signed.example/upload");
        expect(result.key).toMatch(/^tasks\/host-1\/[0-9a-f-]{36}\.png$/);
        expect(mockPutObjectCommand).toHaveBeenCalledWith({
            Bucket: "domits-task-attachments",
            Key: result.key,
            ContentType: "image/png",
            ContentLength: 2048,
        });
        const [, , options] = mockGetSignedUrl.mock.calls[0];
        expect(options.expiresIn).toBe(300);
        expect([...options.signableHeaders].sort()).toEqual(["content-length", "content-type"]);
    });

    it("signs nothing for a refused file", async () => {
        await expect(getUploadUrl("host-1", "text/html", "2048")).rejects.toMatchObject({ statusCode: 400 });

        expect(mockGetSignedUrl).not.toHaveBeenCalled();
    });
});
