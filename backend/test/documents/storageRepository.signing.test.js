import { UploadService } from "../../functions/documents/business/service/uploadService.js";

const SIGNING_ENV = Object.freeze({
  AWS_ACCESS_KEY_ID: "AKIAEXAMPLEDOCUMENTS",
  AWS_SECRET_ACCESS_KEY: "example-documents-signing-secret",
  AWS_REGION: "eu-north-1",
  DOCUMENTS_BUCKET: "example-documents-bucket",
});

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

const useEnvironment = (environment) => jest.replaceProperty(process, "env", { ...environment });

const withoutBucket = (bucketName) => {
  const { DOCUMENTS_BUCKET, ...rest } = SIGNING_ENV;
  return bucketName === undefined ? rest : { ...rest, DOCUMENTS_BUCKET: bucketName };
};

afterEach(() => jest.restoreAllMocks());

describe("the signed document upload link", () => {
  beforeEach(() => useEnvironment(SIGNING_ENV));

  it("names a new file in the host's own folder, with the extension of its type", async () => {
    const { key } = await new UploadService().createUploadUrl("host-1", "application/pdf", "4096");

    expect(key).toMatch(new RegExp(`^documents/host-1/${UUID}\\.pdf$`));
  });

  it("gives every upload a new name", async () => {
    const service = new UploadService();

    const first = await service.createUploadUrl("host-1", "image/png", "10");
    const second = await service.createUploadUrl("host-1", "image/png", "10");

    expect(first.key).not.toBe(second.key);
  });

  it("only accepts a PUT of that file into the configured bucket, with the declared type and size, for five minutes", async () => {
    const { uploadUrl, key } = await new UploadService().createUploadUrl("host-1", "application/pdf", "4096");

    const url = new URL(uploadUrl);
    expect(url.hostname).toBe(`${SIGNING_ENV.DOCUMENTS_BUCKET}.s3.${SIGNING_ENV.AWS_REGION}.amazonaws.com`);
    expect(url.pathname).toBe(`/${key}`);
    expect(url.searchParams.get("X-Amz-SignedHeaders").split(";")).toEqual(
      expect.arrayContaining(["content-length", "content-type", "host"])
    );
    expect(url.searchParams.get("X-Amz-Expires")).toBe("300");
  });

  it("carries no checksum parameter, so S3 checks the uploaded body against nothing precomputed", async () => {
    const { uploadUrl } = await new UploadService().createUploadUrl("host-1", "application/pdf", "4096");

    const parameterNames = [...new URL(uploadUrl).searchParams.keys()];
    expect(parameterNames.filter((name) => name.toLowerCase().includes("checksum"))).toEqual([]);
  });

  it("signs nothing for a file the validator refuses", async () => {
    await expect(new UploadService().createUploadUrl("host-1", "text/html", "4096")).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe("the document bucket setting", () => {
  test.each([undefined, "", "   "])("refuses to sign when DOCUMENTS_BUCKET is %p", async (bucketName) => {
    useEnvironment(withoutBucket(bucketName));

    const signing = new UploadService().createUploadUrl("host-1", "application/pdf", "4096");

    await expect(signing).rejects.toThrow("DOCUMENTS_BUCKET is not set");
    await expect(signing).rejects.not.toHaveProperty("statusCode");
  });
});
