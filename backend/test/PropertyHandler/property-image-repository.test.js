import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { PropertyImageRepository } from "../../functions/PropertyHandler/data/repository/propertyImageRepository.js";
import Database from "../../ORM/index.js";

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn(() => "signed-url"),
}));

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
}));

jest.mock("../../ORM/index.js", () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

const makeQueryBuilder = (rows = []) => ({
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue(rows),
});

describe("PropertyImageRepository", () => {
  beforeEach(() => {
    Database.getInstance.mockResolvedValue({
      getRepository: jest.fn((entity) => {
        const tableName = entity?.options?.tableName;
        if (tableName === "property_image_v2") {
          return { createQueryBuilder: jest.fn(() => makeQueryBuilder([])) };
        }
        if (tableName === "property_image_variant") {
          return { createQueryBuilder: jest.fn(() => makeQueryBuilder([])) };
        }
        if (tableName === "property_image") {
          return {
            createQueryBuilder: jest.fn(() =>
              makeQueryBuilder([{ property_id: "prop-1", key: "legacy-key" }])
            ),
          };
        }
        return { createQueryBuilder: jest.fn(() => makeQueryBuilder([])) };
      }),
    });
  });

  it("creates presigned upload URL with expected key", async () => {
    const repo = new PropertyImageRepository({});
    const result = await repo.createPresignedOriginalUpload(
      "prop-1",
      "img-1",
      "image/png"
    );
    expect(result.key).toBe("images/prop-1/img-1/original.png");
    expect(result.url).toBe("signed-url");
  });

  it("falls back to legacy images when no variant images exist", async () => {
    const repo = new PropertyImageRepository({});
    const images = await repo.getImagesByPropertyId("prop-1");
    expect(images).toEqual([{ property_id: "prop-1", key: "legacy-key" }]);
  });
});