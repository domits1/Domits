jest.mock("database", () => require("./taskRepositoryTestDoubles.js").databaseMock);
jest.mock("../../functions/property-tasks/data/taskRepository.js", () => require("./taskRepositoryTestDoubles.js").taskRepositoryMock);

const SIGNING_ENV = { AWS_ACCESS_KEY_ID: "AKIAEXAMPLESIGNING", AWS_SECRET_ACCESS_KEY: "example-local-signing", AWS_SESSION_TOKEN: undefined, AWS_PROFILE: undefined };
const setEnv = (values) => Object.entries(values).forEach(([name, value]) => {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
});

describe("the signed upload link", () => {
    const savedEnv = Object.fromEntries(Object.keys(SIGNING_ENV).map((name) => [name, process.env[name]]));

    beforeAll(() => setEnv(SIGNING_ENV));
    afterAll(() => setEnv(savedEnv));

    it("only accepts an upload with the declared type and size, for five minutes", async () => {
        const { getUploadUrl } = require("../../functions/property-tasks/business/service/taskService.js");

        const { uploadUrl, key } = await getUploadUrl("host-1", "application/pdf", "4096");

        const url = new URL(uploadUrl);
        expect(url.pathname).toBe(`/${key}`);
        expect(url.searchParams.get("X-Amz-SignedHeaders").split(";")).toEqual(expect.arrayContaining(["content-length", "content-type", "host"]));
        expect(url.searchParams.get("X-Amz-Expires")).toBe("300");
    });
});
